import Thread, {TaskState, Task} from './Thread'

export interface ExecuteOptions {
    step?: (message: any, index: number, totalLength: number) => void
}


interface ThreadsInterface {
    push(callback: Function, message?: any): this

    execute(options: ExecuteOptions): Promise<any[]>

    readonly threads: Thread[]
    readonly pool: Task[]
}

export default class Threads implements ThreadsInterface {
    readonly #threadCount: number
    readonly #threads: Thread[] = []
    readonly #pool: Task[] = []


    constructor(threadCount: number = 3) {
        this.#threadCount = Math.max(1, Math.min(threadCount, navigator.hardwareConcurrency - 1))

        // Create threads
        let index: number = 0
        this.#threads = [...Array(this.#threadCount)].map(() => {
            return new Thread(index++)
        })
    }

    push(callback: Function, message?: any): this {
        this.#pool.push({
            callback,
            message,
            index: this.#pool.length,
            state: TaskState.PENDING
        })

        return this
    }

    async execute(options: ExecuteOptions): Promise<any[]> {
        if (this.#pool.length === 0) {
            console.warn(`No tasks to execute`)
            return []
        }

        const pool: Task[] = this.#pool.splice(0, this.#pool.length)

        const promises: Promise<any>[] = this.#threads.map((thread: Thread) => {
            // Reference of the pool is passed to each thread
            return thread.execute(pool, options)
        })

        // Wait for all threads to finish and flatten the responses
        return await Promise.all(promises).then((responses: any[][]) => this.#mergeResponses(responses))

    }

    #mergeResponses(responses: any[][]): any[] {
        for (let i = 0; i < responses[0].length; i++) {
            for (let j = 1; j < responses.length; j++) {
                if (responses[j][i] !== undefined) responses[0][i] = responses[j][i]
            }
        }

        return responses[0]
    }

    get threads(): Thread[] {
        return this.#threads
    }

    get pool(): Task[] {
        return this.#pool
    }
}
