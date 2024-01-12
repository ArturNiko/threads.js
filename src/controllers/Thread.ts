import LiveWorker from './LiveWorker'
import {ExecuteOptions} from './Threads'

export enum State {
    IDLE = 'idle',
    RUNNING = 'running'
}

enum TasksRelation {
    'NONE' = 'none',
    'CHAINED' = 'chained',
}

export interface Settings {
    tasksRelation: TasksRelation
}

export interface Task {
    task: Function
    message?: any
    index: number
    //state: TaskState
    threadIndex?: number
}


interface ThreadInterface {
    execute(pool: Task[], options?: ExecuteOptions): Promise<any[]>
}

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
        if (this.#state === State.RUNNING) {
            console.warn(`Thread ${this.#index} is already running`)
            return []
        }

        this.#state = State.RUNNING
        const responses: any[] = []
        responses.length = pool.length

        let chainedResponse: any = undefined

        while (this.#getNextTaskFromPool(pool)) {
            // Get the next task from the pool
            const taskWrapper: Task = this.#getNextTaskFromPool(pool)!

            // If the tasks relation is CHAINED, then the message of the next task is the response of the previous task
            if((options?.tasksRelation ?? this.#settings.tasksRelation) === TasksRelation.CHAINED && chainedResponse) taskWrapper.message = chainedResponse

            // Run the task
            responses[taskWrapper.index] = chainedResponse = await this.#worker.run(taskWrapper.task, taskWrapper.message)

            // Execute the step callback
            options?.step?.(responses[taskWrapper.index], taskWrapper.index, responses.length)

            // Remove the task from the pool (Dumping resolved task)
            pool.splice(pool.indexOf(taskWrapper), 1)
        }

        this.#state = State.IDLE
        return responses
    }

    #getNextTaskFromPool(pool: Task[]): Task | undefined {
        return pool.find(task => {
            // The logic:
            // if the tasks relation is CHAIN, then the thread can execute only the tasks that are reserved for this thread
            // if the tasks relation is NONE, then the thread can execute any task except of the reserved tasks for other threads
            // This logic is based on the fact that you can either execute the tasks in parallel(on all threads) or in chain (on one thread)
            // Might rework this logic in the future  ↓ ↓ ↓ ↓
            return this.#settings.tasksRelation === TasksRelation.CHAINED
                ? task.threadIndex === this.#index
                : task.threadIndex === undefined || task.threadIndex === this.#index
        })
    }

    get state(): State {
        return this.#state
    }
}
