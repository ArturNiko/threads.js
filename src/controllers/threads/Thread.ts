import ThreadInterface, {Settings, State, Task, TasksRelation} from '../../types/threads/Thread'

import {ExecuteOptions} from '../../types/threads/Threads'

import LiveWorker from './LiveWorker'


export default class Thread implements ThreadInterface {
    readonly #worker: LiveWorker = new LiveWorker()
    readonly #index: number
    readonly #settings: Settings

    #state: State = State.IDLE



    constructor(index: number, settings?: Settings) {
        this.#index = index
        this.#settings = {
            tasksRelation: settings?.tasksRelation ?? TasksRelation.NONE,
        }
    }

    async execute(pool: Task[], options?: ExecuteOptions): Promise<any[]> {
        if (this.#state === State.RUNNING) await this.#awaitIdle()

        // Set up
        this.#state = State.RUNNING

        const taskRelation: TasksRelation = options?.tasksRelation ?? this.#settings.tasksRelation

        const responses: any[] = options?.responses ?? []
        responses.length = options?.poolSize ?? pool.length

        let chainedResponse: any = undefined

        while (this.#getNextTaskFromPool(pool)) {
            // Get the next task from the pool
            const taskWrapper: Task = this.#getNextTaskFromPool(pool)!

            // Remove the task from the pool (Dumping resolved task)
            pool.splice(pool.indexOf(taskWrapper), 1)

            // If the tasks relation is CHAINED, then the message of the next task is the response of the previous task
            if(taskRelation === TasksRelation.CHAINED) taskWrapper.message = chainedResponse ?? taskWrapper.message

            // Run the task and get the response
            responses[taskWrapper.index] = chainedResponse = await this.#worker.run(taskWrapper.task, taskWrapper.message)

            // Execute the step callback
            const progress: number = 100 * responses.reduce((acc, response) => acc + (response !== undefined ? 1 : 0), 0) / responses.length
            options?.step?.(responses[taskWrapper.index], progress)
        }

        this.#state = State.IDLE
        return responses
    }

    block(): void {
        this.#state = State.BLOCKED
    }

    #getNextTaskFromPool(pool: Task[]): Task | undefined {
        return pool.find(task => {
            // The logic:
            // if the tasks relation is CHAIN or the thread is blocked, then the thread can execute only the tasks with the same thread index
            // if the tasks relation is NONE and the thread is not blocked, then the thread can execute all tasks that are not assigned to other threads
            // This logic is based on the fact that you can either execute the tasks in parallel(on all threads) or in chain (on one thread)
            // Might rework this logic in the future  ↓ ↓ ↓ ↓

            return this.#settings.tasksRelation === TasksRelation.CHAINED || this.#state === State.BLOCKED
                ? task.threadIndex === this.#index
                : task.threadIndex === undefined || task.threadIndex === this.#index
        })
    }

    #awaitIdle(): Promise<void> {
        return new Promise<void>((resolve) => {
            // Simple interval to check if the thread is not busy anymore
            const interval = setInterval(() => {
                if (this.#state === State.IDLE) {
                    clearInterval(interval)
                    resolve()
                }
            })
        })
    }

    get state(): State {
        return this.#state
    }
}
