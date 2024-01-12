import Thread, {Task, Settings, State as ThreadState} from './Thread'

export interface ExecuteOptions extends Settings {
    step?: (message: any, index: number, totalLength: number) => void
    threadIndex?: number
}


interface ThreadsInterface {
    push(callback: Function, message?: any): this

    insert(callback: Function, threadIndex: number, message?: any): this

    execute(options?: ExecuteOptions): Promise<any[]>

    run(task: Function, message?: any): Promise<any>

    get poolSize(): number

    get threadsCount(): number
}

export default class Threads implements ThreadsInterface {
    readonly #threadCount: number
    readonly #threads: Thread[] = []
    readonly #pool: Task[] = []


    constructor(threadCount: number = 3, settings?: Settings) {
        this.#threadCount = Math.max(1, Math.min(threadCount, navigator.hardwareConcurrency * 2 - 1))

        // Create threads
        let index: number = 0
        this.#threads = [...Array(this.#threadCount)].map(() => {
            return new Thread(index++, settings)
        })
    }

    push(task: Function, message?: any): this {
        this.#pool.push({
            task,
            message,
            index: this.#pool.length,
            //state: TaskState.PENDING,
        })

        return this
    }

    insert(task: Function, threadIndex: number,  message?: any): this {
        this.#pool.push({
            task,
            message,
            index: this.#pool.length,
            threadIndex
        })

        return this
    }

    async execute(options?: ExecuteOptions): Promise<any[]> {
        if (this.#pool.length === 0) {
            console.warn(`No tasks to execute`)
            return []
        }

        const pool: Task[] = []
        if (typeof options?.threadIndex === 'number') {
            while (this.#pool.find(task => task.threadIndex === options.threadIndex)) {
                const index: number = this.#pool.findIndex(task => task.threadIndex === options.threadIndex)!
                pool.push(...this.#pool.splice(index, 1))
            }

            return await this.#threads[options.threadIndex].execute(pool, options)
        }

        else {
            const promises: Promise<any>[] = this.#threads.map((thread: Thread) => thread.execute(pool, options))
            return await Promise.all(promises).then((responses: any[][]) => this.#mergeResponses(responses))
        }
    }

    async run(task: Function, message?: any): Promise<any> {
        const pool: Task[] = [{
            task,
            message,
            index: this.#pool.length,
        }]

        const availableThread: Thread | undefined = this.#threads.find(thread => thread.state === ThreadState.IDLE)

        return !availableThread
            ? await this.#threads[0].execute(pool)
            : console.warn(`All threads are busy`)


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

    get pool(): Task[] {
        return this.#pool
    }
}
