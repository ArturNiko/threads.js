interface ExecuteOptions {
    step?: (message: any, index: number, totalLength: number) => void
}

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


export default class Threads {
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
        for(let i = 0; i < responses[0].length; i++) {
            for(let j = 1; j < responses.length; j++) {
                if(responses[j][i] !== undefined) responses[0][i] = responses[j][i]
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


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
export class Thread {
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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
enum Command {
    RUN = 'run',
    TERMINATE = 'terminate',
}

export class LiveWorker {
    readonly #worker: Worker

    #callback: (message: any) => void = () => {
    }

    constructor() {
        const bytes: Uint8Array = new TextEncoder().encode(`
            async function handle(taskResponse) {
                postMessage(await taskResponse)
            }
        
            self.onmessage = (message) => {
                const data = message.data
           
                switch (data.command) {
                    case 'run':
                        handle(eval(\`(\${data.task})(\${data.value})\`))
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