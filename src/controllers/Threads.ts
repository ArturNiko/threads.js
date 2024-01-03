import Thread, {AllExecuteOptionsInterface, WorkerWrapper, ExecutionMode, State as ThreadState} from './Thread'

interface TaskOptionsInterface {
    message?: any,
    index?: number
}

interface OptionsInterface {
    executionMode?: ExecutionMode,
}

interface ThreadsInterface {
    execute(options?: AllExecuteOptionsInterface): Promise<any>

    push(task: Function, options?: TaskOptionsInterface): this | false

    get threads(): Thread[]

    get taskCount(): number

}

export default class Threads implements ThreadsInterface {
    readonly #threadCount: number
    readonly #threads: Thread[] = []


    constructor(threadCount: number, options?: OptionsInterface) {
        this.#threadCount = Math.min(threadCount, navigator.hardwareConcurrency ? navigator.hardwareConcurrency - 1 : 3)

        // Create threads
        let index: number = 0
        this.#threads = [...Array(this.#threadCount)].map(() => {
            return new Thread(index++, options?.executionMode)
        })
    }

    async execute(options?: AllExecuteOptionsInterface): Promise<any[] | undefined> {
        if (options?.index !== undefined) {
            if(this.#threads[options.index] === undefined) console.warn(`Execution: Thread with index ${options.index} does not exist`)
            return this.#threads[options.index]?.execute({mode: options?.mode, stepCallback: options?.stepCallback})
        }


        return this.#flattenFinalResponse(await Promise.all([
            ...this.#threads
                .filter(thread => thread.pool.length > 0 && thread.state === ThreadState.IDLE)
                .map(thread => thread.execute({mode: options?.mode, stepCallback: options?.stepCallback}))
        ]))
    }

    push(task: Function, options?: TaskOptionsInterface): this {
        const worker: Worker = this.#createWorker(task.toString())

        if (options?.index !== undefined) {
            if(this.#threads[options.index] === undefined) console.warn(`Push: Thread with index ${options.index} does not exist`)
            this.#threads[options.index]?.push(worker, options?.message)
        }
        else this.#sortPush(worker, options?.message)

        return this
    }

    #sortPush(worker: Worker, message?: any): void {
        // Find the thread with the least amount of workers
        const availableThreads: Thread[] = this.#threads.filter(thread => thread.state === ThreadState.IDLE)

        if (availableThreads.length === 0) {
            console.warn(`Push: No available threads`)
            return
        }

        const thread: Thread = availableThreads.reduce((thread1: Thread, Thread: Thread) => thread1.pool.length > Thread.pool.length ? Thread : thread1)

        thread.push(worker, message)
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
}