type WorkerWrapper = {
    worker: Worker
    message: any
    callback?: Function
}

type Thread = WorkerWrapper[]

enum Mode {
    ALL = 'all',
    RACE = 'race',
}

interface ThreadsInterface {
    execute(index?: number): Promise<any>

    get threads(): Thread[]
}

export default class Threads implements ThreadsInterface {
    readonly #threadCount: number
    readonly #threads: Thread[] = []

    #temporaryResponse: any = {}


    constructor(threadCount: number) {
        this.#threadCount = Math.min(threadCount, navigator.hardwareConcurrency ? navigator.hardwareConcurrency - 1 : 3)
        this.#threads = [...Array(this.#threadCount)].map(() => []) // Create empty thread pool

    }

    async execute(index?: number): Promise<any> {
        if (index !== undefined) {
            if (!this.threads[index]) return

            return await this.#runThread(this.threads[index]!)
        }
        else {
            const promises: Promise<any>[] = []
            this.#threads.forEach(thread => {
                if (thread.length > 0) promises.push(this.#runThread(thread))
            })

            return this.#flattenFinalResponse(await Promise.all(promises))
        }
    }

    push(method: Function, message: any): this {
        const worker: Worker = this.#createWorker(method.toString())
        this.#sortPush(worker, message)

        return this
    }

    async #runThread(thread: Thread): Promise<any[]> {
        const finalResponse: any[] = []

        // Create a promise for each worker in the thread
        for (const workerWrapper of thread) {
            await new Promise<void>((resolve) => {
                workerWrapper.worker.postMessage(workerWrapper.message)
                workerWrapper.callback = () => {
                    finalResponse.push(this.#temporaryResponse)
                    workerWrapper.worker.terminate()
                    resolve()
                }
            })
        }

        // Clear the thread
        thread.splice(0, thread.length)

        return finalResponse
    }

    #sortPush(worker: Worker, message: any): number {
        const thread: Thread = this.#threads.reduce((thread1: Thread, thread2: Thread) => thread1 > thread2 ? thread2 : thread1)
        const index: number = this.#threads.indexOf(thread)

        this.#threads[index].push({worker, message})
        return index
    }

    #flattenFinalResponse(response: any[][]): any[] {
        const finalResponse: any[] = []
        const longestThread: number = response.reduce((longestThread: number, thread: any[]) => thread.length > longestThread ? thread.length : longestThread, 0)

        for (let i = 0; i < longestThread; i++) {
            response.forEach(threadResponse => {
                if (threadResponse[i] !== undefined) finalResponse.push(threadResponse[i])
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
            this.#temporaryResponse = message.data
            this.#threads.forEach((thread: Thread) => {
                thread.forEach((workerWrapper: WorkerWrapper) => {
                    if (workerWrapper.worker === worker) workerWrapper.callback?.()
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
}