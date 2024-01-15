import ThreadsInterface, {ExecuteOptions, ThreadLoad} from '../../types/threads/Threads'

import Thread from './Thread'
import {Task, Settings, State as ThreadState} from '../../types/threads/Thread'

import LiveWorker from './LiveWorker'

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

    insert(task: Function, threadIndex: number, message?: any): this {
        if(!this.#threads[threadIndex]) {
            console.warn(`Thread ${threadIndex} does not exist`)
            return this
        }
        if(this.#threads[threadIndex]?.state === ThreadState.BLOCKED) {
            console.warn(`Thread ${threadIndex} is blocked. Execute the thread to unblock it`)
            return this
        }

        this.#pool.push({
            task,
            message,
            index: this.#pool.length,
            threadIndex
        })

        return this
    }

    async executeAll(options?: ExecuteOptions): Promise<any[]> {
        if (this.#pool.length === 0) {
            console.warn(`No tasks to execute`)
            return []
        }

        // Get all tasks
        const pool: Task[] = [...this.#pool.splice(0, this.#pool.length)]

        //@todo: rework this
        // Ugly syncing pool size for the threads 😩
        const syncOptions: ExecuteOptions = Object.assign({poolSize: pool.length, responses: []}, options)
        const promises: Promise<any>[] = this.#threads.map((thread: Thread) => thread.execute(pool, syncOptions))

        return await Promise.all(promises).then((responses: any[][]) => this.#mergeResponses(responses))
    }

    async execute(threadIndex: number, options?: ExecuteOptions): Promise<any[]> {
        if (!this.#findThreadSpecificPool(threadIndex)) {
            console.warn(`No tasks to execute`)
            return []
        }
        if (!this.#threads[threadIndex]) {
            console.warn(`Thread ${threadIndex} does not exist`)
            return []
        }

        // Get all tasks with the specified thread index
        const pool: Task[] = []
        while (this.#findThreadSpecificPool(threadIndex)) {
            const index: number = this.#findThreadSpecificPool(threadIndex, 'index')
            pool.push(...this.#pool.splice(index, 1))
        }

        // Reindex the pool
        this.#pool.forEach((task, index) => task.index = index)

        return await this.#threads[threadIndex].execute(pool, options)
    }

    // Creates own thread and executes the task
    async run(task: Function, message?: any): Promise<any> {
        const worker: LiveWorker = new LiveWorker()
        const result: Promise<any> = worker.run(task, message)

        worker.terminate()

        return result
    }

    clear(): void {
        this.#pool.length = 0
    }

    block(threadIndex: number): void {
        if(!this.#threads[threadIndex]) console.warn(`Thread ${threadIndex} does not exist`)
        this.#threads[threadIndex]?.block()
    }

    #mergeResponses(responses: any[][]): any[] {
        return responses.reduce((merged, response) => {
            response.forEach((value, index) => {
                if (value !== undefined) merged[index] = value
            })
            return merged
        }, responses[0])
    }

    #findThreadSpecificPool<T extends string>(threadIndex: number, index?: T): T extends 'index' ? number : Task | undefined {
        return index === 'index'
            ? this.#pool.findIndex(task => task.threadIndex === threadIndex) as T extends 'index' ? number : never
            : this.#pool.find(task => task.threadIndex === threadIndex) as T extends 'index' ? never : Task | undefined
    }

    get pool(): Task[] {
        return this.#pool
    }

    get threadLoad(): ThreadLoad {
        return this.#pool.reduce((acc, task) => {
            if (task.threadIndex !== undefined) acc[`Thread ${task.threadIndex}`] = (acc[`Thread ${task.threadIndex}`] ?? 0) + 1
            else acc['shared'] = (acc['shared'] ?? 0) + 1

            return acc
        }, {} as ThreadLoad)
    }

    get threadCount(): number {
        return this.#threads.length
    }
}
