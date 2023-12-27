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
    push(task: Function, message: any): this

    get threads(): Thread[]
}

export default class Threads implements ThreadsInterface {
    readonly #threadCount: number
    readonly #threads: Thread[] = []


    constructor(threadCount: number) {
        this.#threadCount = Math.min(threadCount, navigator.hardwareConcurrency ? navigator.hardwareConcurrency - 1 : 3)

        // Create empty pools for each thread
        this.#threads = [...Array(this.#threadCount)].map(() => [])

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

    push(task: Function, message: any, index?: number): this {
        const worker: Worker = this.#createWorker(task.toString())

        if (index !== undefined) this.#threads[index].push({worker, message})
        else this.#sortPush(worker, message)

        return this
    }

    async #runThread(thread: Thread): Promise<any[]> {
        const finalResponse: any[] = []

        // Create a promise for each worker in the thread
        for (const workerWrapper of thread) {
            await new Promise<void>((resolve) => {
                workerWrapper.callback = (message: any) => {
                    finalResponse.push(message)
                    workerWrapper.worker.terminate()
                    resolve()
                }
                // Send the message to the worker and wait for the callback ⤴
                workerWrapper.worker.postMessage(workerWrapper.message)
            })
        }

        // Clear the thread
        thread.splice(0, thread.length)

        return finalResponse
    }

    #sortPush(worker: Worker, message: any): void {
        // Find the thread with the least amount of workers (first available)
        const thread: Thread = this.#threads.reduce((thread1: Thread, thread2: Thread) => thread1 > thread2 ? thread2 : thread1)
        thread.push({worker, message})
    }

    #flattenFinalResponse(response: any[][]): any[] {
        const finalResponse: any[] = []
        const longestThreadLength: number = response.reduce((longestLength: number, thread: any[]) => thread.length > longestLength ? thread.length : longestLength, 0)

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
                thread.forEach((workerWrapper: WorkerWrapper) => {
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
}