import '../utils/JSONValidate'


enum TaskState {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
}

interface Task {
    callback: Function
    message?: any
    index: number
    state: TaskState
}


export default class Threads2 {
    readonly #threadCount: number
    readonly #threads: Thread2[] = []
    readonly #pool: Task[] = []


    constructor(threadCount: number = 3) {
        this.#threadCount = Math.max(1, Math.min(threadCount, navigator.hardwareConcurrency - 1))

        // Create threads
        let index: number = 0
        this.#threads = [...Array(this.#threadCount)].map(() => {
            return new Thread2(index++)
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

    async execute(): Promise<any[]> {
        if (this.#pool.length === 0) {
            console.warn(`No tasks to execute`)
            return []
        }

        const pool: Task[] = this.#pool.splice(0, this.#pool.length)

        const promises: Promise<any>[] = this.#threads.map((thread: Thread2) => {
            return thread.execute(pool) // Do not forget that we are passing the reference to the pool
        })

        return await Promise.all(promises)
    }


    get threads(): Thread2[] {
        return this.#threads
    }

    get pool(): Task[] {
        return this.#pool
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
class Thread2 {
    readonly #worker: LiveWorker2 = new LiveWorker2()
    readonly #index: number


    constructor(index: number) {
        this.#index = index
    }

    async execute(pool: Task[]): Promise<any> {
        const responses: any[] = []
        responses.length = pool.length

        while (pool.find(task => task.state === TaskState.PENDING)) {
            const task: Task = pool.find(task => task.state === TaskState.PENDING)!
            task.state = TaskState.RUNNING
            responses[task.index] = await this.#worker.run(task.callback, JSON.validate(task.message) ? JSON.stringify(task.message) : task.message.toString())
            task.state = TaskState.COMPLETED
            pool.splice(pool.indexOf(task), 1, task)
        }

        return responses
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
enum Command {
    RUN = 'run',
    TERMINATE = 'terminate',
}

export class LiveWorker2 {
    readonly #worker: Worker

    #callback: (message: any) => void = () => {
    }

    constructor() {
        const bytes: Uint8Array = new TextEncoder().encode(`
            self.onmessage = (message) => {
                switch (message.data.command) {
                    case 'run':
                        eval(\`(\${message.data.task})(\${message.data.value})\`)
                        break
                    case 'terminate':
                        postMessage('terminated')
                        self.close()
                }
            }`)
        const blob: Blob = new Blob([bytes], {type: 'application/javascript'})
        const url: string = URL.createObjectURL(blob)
        this.#worker = new Worker(url)


        this.#worker.onmessage = (message: MessageEvent): void => {
            this.#callback(message.data)
        }
        this.#worker.onerror = console.error
    }


    async run(task: Function, value?: any): Promise<any> {
        const response = new Promise<any>((resolve) => {

            this.#callback = (message: any) => {
                resolve(message)
            }
        })
        this.#worker.postMessage({command: Command.RUN, task: task.toString(), value})

        return await response
    }

    terminate() {
        this.#worker.postMessage({command: Command.TERMINATE})

    }
}