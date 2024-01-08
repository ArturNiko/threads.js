import LiveWorker from './LiveWorker'
import {ExecuteOptions} from './Threads'

export enum TaskState {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
}

enum State {
    IDLE = 'idle',
    RUNNING = 'running'
}

export interface Task {
    task: Function
    message?: any
    index: number
    state: TaskState
}


interface ThreadInterface {
    execute(pool: Task[], options: ExecuteOptions): Promise<any[]>
}

export default class Thread implements ThreadInterface {
    readonly #worker: LiveWorker = new LiveWorker()
    readonly #index: number
    #state: State = State.IDLE


    constructor(index: number) {
        this.#index = index
    }

    async execute(pool: Task[], options: ExecuteOptions): Promise<any[]> {
        if (this.#state === State.RUNNING) {
            console.warn(`Thread ${this.#index} is already running`)
            return []
        }

        this.#state = State.RUNNING
        const responses: any[] = []
        responses.length = pool.length

        while (pool.find(task => task.state === TaskState.PENDING)) {
            const taskWrapper: Task = pool.find(task => task.state === TaskState.PENDING)!

            taskWrapper.state = TaskState.RUNNING
            responses[taskWrapper.index] = await this.#worker.run(taskWrapper.task, taskWrapper.message)
            taskWrapper.state = TaskState.COMPLETED

            options.step?.(responses[taskWrapper.index], taskWrapper.index, responses.length)
            pool.splice(pool.indexOf(taskWrapper), 1)
        }

        this.#state = State.IDLE
        return responses
    }
}
