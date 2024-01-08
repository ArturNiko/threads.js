import LiveWorker from './LiveWorker'
import {ExecuteOptions} from './Threads'

export enum TaskState {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
}

export interface Task {
    callback: Function
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


    constructor(index: number) {
        this.#index = index
    }

    async execute(pool: Task[], options: ExecuteOptions): Promise<any[]> {
        const responses: any[] = []
        responses.length = pool.length

        while (pool.find(task => task.state === TaskState.PENDING)) {
            const task: Task = pool.find(task => task.state === TaskState.PENDING)!

            task.state = TaskState.RUNNING
            responses[task.index] = await this.#worker.run(task.callback, task.message)
            task.state = TaskState.COMPLETED

            options.step?.(responses[task.index], task.index, responses.length)
            pool.splice(pool.indexOf(task), 1)
        }

        return responses
    }
}
