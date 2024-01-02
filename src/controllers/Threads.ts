type WorkerWrapper = {
    worker: Worker
    message: any
    callback?: Function
}


enum MessageMode {
    REGULAR = 'regular',
    CHAINED = 'chained'
}

enum ResponseMode {
    ALL = 'all',
    LAST = 'last'
}

enum ThreadState {
    IDLE = 'idle',
    BUSY = 'busy'
}

interface Thread {
    state: ThreadState,
    pool: WorkerWrapper[]
}

interface TaskOptionsInterface  {
    message?: any,
    index?: number
}

interface OptionsInterface {
    messageMode?: MessageMode,
    responseMode?: ResponseMode,
}

interface ExecuteOptionsInterface extends OptionsInterface {
    index?: number,
    stepCallback?: Function
}

interface ThreadsInterface {
    execute(options?: ExecuteOptionsInterface): Promise<any>
    push(task: Function, options?: TaskOptionsInterface): this|false

    get threads(): Thread[]
}

export default class Threads implements ThreadsInterface {
    readonly #threadCount: number
    readonly #threads: Thread[] = []

    messageMode: MessageMode
    responseMode: ResponseMode

    constructor(threadCount: number, options?: OptionsInterface) {
        this.#threadCount = Math.min(threadCount, navigator.hardwareConcurrency ? navigator.hardwareConcurrency - 1 : 3)

        // Create threads
        this.#threads = [...Array(this.#threadCount)].map(() => {
            return {pool: [], state: ThreadState.IDLE}
        })

        this.messageMode = options?.messageMode ?? MessageMode.REGULAR
        this.responseMode = options?.responseMode ?? ResponseMode.ALL
    }

    async execute(options?: ExecuteOptionsInterface): Promise<any> {
        if (options?.index !== undefined) {
            if (this.threads[options.index]?.state !== ThreadState.IDLE) return

            return await this.#runThread(this.threads[options.index]!
                , options?.messageMode ?? this.messageMode
                , options?.responseMode ?? this.responseMode
                , options?.stepCallback)
        }
        else {
            const promises: Promise<any>[] = []
            this.#threads.forEach(thread => {
                if (thread.pool.length > 0 && thread.state === ThreadState.IDLE) {
                    promises.push(this.#runThread(thread
                        , options?.messageMode ?? this.messageMode
                        , options?.responseMode ?? this.responseMode
                        , options?.stepCallback))
                }
            })

            return this.#flattenFinalResponse(await Promise.all(promises))
        }
    }

    push(task: Function, options?: TaskOptionsInterface): this {
        const worker: Worker = this.#createWorker(task.toString())

        if (options?.index !== undefined) this.#threads[options.index]?.pool?.push({worker, message: options?.message})
        else this.#sortPush(worker, options?.message)

        return this
    }

    async #runThread(thread: Thread, messageMode: MessageMode, responseMode: ResponseMode, stepCallback?: Function): Promise<any[]> {
        const finalResponse: any[] = []

        let poolTempResponse: any = undefined

        // Create a promise for each worker in the thread
        thread.state = ThreadState.BUSY
        for (const workerWrapper of thread.pool) {
            await new Promise<void>((resolve) => {
                workerWrapper.callback = (message: any) => {
                    poolTempResponse = message
                    finalResponse.push(message)
                    workerWrapper.worker.terminate()
                    stepCallback?.(message, thread)
                    resolve()
                }
                // Send the message to the worker and wait for the callback ⤴
                workerWrapper.worker.postMessage(
                    messageMode === MessageMode.CHAINED && poolTempResponse
                        ? poolTempResponse
                        : workerWrapper.message)
            })
        }

        // Clear the thread
        thread.pool.splice(0, thread.pool.length)
        thread.state = ThreadState.IDLE

        return responseMode === ResponseMode.LAST ? [finalResponse[finalResponse.length - 1]] : finalResponse
    }

    #sortPush(worker: Worker, message?: any): void {
        // Find the thread with the least amount of workers (first available)
        const thread: Thread = this.#threads.reduce((thread1: Thread, thread2: Thread) => thread1.pool.length > thread2.pool.length ? thread2 : thread1)

        thread.pool.push({worker, message})

    }

    #flattenFinalResponse(response: any[][]): any[] {
        const finalResponse: any[] = []
        const longestThreadLength: number = response.reduce((longestLength: number, pool: any[]) => pool.length > longestLength ? pool.length : longestLength, 0)

        for (let i = 0; i < longestThreadLength; i++) {
            response.forEach(threadResponse => {
                //The thread may have fewer responses than the longest thread or may contain falsy values
                if (threadResponse.length > i) finalResponse.push(threadResponse[i])
            })
        }


        return finalResponse
    }

    #createWorker(method: string): Worker {
        const bytes: Uint8Array = new TextEncoder().encode(`self.onmessage = ${method}`)
        const blob: Blob = new Blob([bytes], {type: 'application/javascript'})
        const url: string = URL.createObjectURL(blob)
        const worker: Worker = new Worker(url)

        worker.onmessage = async (message: MessageEvent): Promise<void> => {
            this.#threads.forEach((thread: Thread) => {
                thread.pool.forEach((workerWrapper: WorkerWrapper) => {
                    if (workerWrapper.worker === worker) workerWrapper.callback!(message.data)
                })
            })
        }

        worker.onerror = (error: ErrorEvent): void => {
            console.error(error)
        }

        return worker
    }

    get threads(): Thread[] {
        return this.#threads
    }

    get taskCount(): number {
        return this.#threads.reduce((count: number, thread: Thread) => count + thread.pool.length, 0)
    }

    get busiestThreadTaskCount(): number {
        return this.#threads.reduce((longestLength: number, thread: Thread) => thread.pool.length > longestLength ? thread.pool.length : longestLength, 0)
    }
}