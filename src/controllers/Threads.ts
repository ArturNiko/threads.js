import Thread, {TaskState, Task} from './Thread'

export interface ExecuteOptions {
    step?: (message: any, index: number, totalLength: number) => void
}


interface ThreadsInterface {
    push(callback: Function, message?: any): this

    execute(options: ExecuteOptions): Promise<any[]>

    run(index: number, task: Function, message?: any): Promise<any>

    get poolSize(): number

    get threadsCount(): number
}

export default class Threads implements ThreadsInterface {
    readonly #threadCount: number
    readonly #threads: Thread[] = []
    readonly #pool: Task[] = []


    constructor(threadCount: number = 3) {
        this.#threadCount = Math.max(1, Math.min(threadCount, navigator.hardwareConcurrency * 2 - 1))

        // Create threads
        let index: number = 0
        this.#threads = [...Array(this.#threadCount)].map(() => {
            return new Thread(index++)
        })
    }

    push(task: Function, message?: any): this {
        this.#pool.push({
            task,
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

    async run(index: number, task: Function, message?: any): Promise<any> {
        const pool: Task[] = [{
            task,
            message,
            index: this.#pool.length,
            state: TaskState.PENDING
        }]

        return await this.#threads[index].execute(pool, {})
    }

    #mergeResponses(responses: any[][]): any[] {
        return responses.reduce((merged, response) => {
            response.forEach((value, index) => {
                if (value !== undefined) merged[index] = value
            })
            return merged
        }, responses[0])
    }

    get poolSize(): number {
        return this.#pool.length
    }

    get threadsCount(): number {
        return this.#threads.length
    }
}
