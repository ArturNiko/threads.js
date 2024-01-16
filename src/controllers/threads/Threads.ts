import ThreadsInterface, {TransferData, Task, Options, ResponseType} from '../../types/threads/Threads'
import {Mode as ThreadMode, State as ThreadState} from '../../types/threads/Thread'

import Thread from './Thread'



export default class Threads implements ThreadsInterface {
    readonly #pools: Task[] = []

    #maxThreadCount: number = 3
    #threads: Thread[] = []


    constructor(maxThreads: number = 3) {
        this.maxThreadCount = maxThreads
    }

    async executeSequential(tasks: Task[], options: Omit<Options, 'threads'> = {}): Promise<any[]> {
        await this.#checkThreadCount()

        const thread: Thread = new Thread(ThreadMode.SEQUENTIAL)
        this.#threads.push(thread)

        console.log(tasks)
        const result: any[] = await thread.execute({
            pool: this.#prepareTasks(tasks),
            step: options.step
        })

        this.dispose()

        return options.response === ResponseType.LAST ? result[result.length - 1] : result
    }

    async executeParallel(tasks: Task[], options: Options = {}): Promise<any[]|any> {
        await this.#checkThreadCount()

        const threadsToSpawn: number = Math.min(options.threads ?? this.#maxThreadCount, tasks.length)

        const syncedData: TransferData = {
            pool: this.#prepareTasks(tasks),
            poolSize: tasks.length,
            responses: [],
            step: options.step
        }

        const promises: Promise<any>[] = []
        for (let i = 0; i < threadsToSpawn; i++) {
            const thread: Thread = new Thread(ThreadMode.PARALLEL)
            this.#threads.push(thread)

            promises.push(thread.execute(syncedData))

        }

        await Promise.all(promises)

        this.dispose()
        return options.response === ResponseType.LAST ? syncedData.responses![syncedData.responses!.length - 1] : syncedData.responses
    }

    dispose(): void {
        for (let i = 0; i < this.#threads.length; i++) {
            if(this.#threads[i].state === ThreadState.IDLE) {
                this.#threads[i].terminate()
                this.#threads.splice(i, 1)
                i --
            }
        }
    }

    async #checkThreadCount(): Promise<void> {
        if (this.#threads.length > this.#maxThreadCount) await this.#awaitFreeThread()
    }

    async #awaitFreeThread(): Promise<void> {
        return new Promise<void>((resolve) => {
            const interval = setInterval(() => {
                if (this.#threads.length < this.#maxThreadCount) {
                    clearInterval(interval)
                    resolve()
                }
            })
        })
    }

    #prepareTasks(pool: (Task|Function)[]): Task[] {
        pool.map((task, index) => {
            if(task instanceof Function) pool[index] = {index, method: task}
            else task.index = index
        })

        return pool as Task[]
    }

    set maxThreadCount(maxThreadsCount: number) {
        this.#maxThreadCount = Math.max(1, Math.min(maxThreadsCount ?? this.#maxThreadCount, navigator.hardwareConcurrency * 2 - 1))
    }

    get maxThreadCount(): number {
        return this.#maxThreadCount
    }
}
