import ThreadsInterface, {Options, TransferData} from '../../types/core/Threads'
import {Mode as ThreadMode} from '../../types/core/Thread'
import {HybridExecutor} from '../../types/core/Executor'

import Thread from './Thread'
import TaskPool from '../partials/TaskPool'
import Environment from '../partials/Environment'


export default class Threads implements ThreadsInterface {
    #maxThreadCount: number = 2
    #loaded: boolean = false
    #threads: Thread[] = []
    #executor: (new() => HybridExecutor) | null = null


    constructor(maxThreads: number = 2) {
        this.maxThreadCount = maxThreads
        this.#load().then(() => this.#loaded = true)
    }

    async executeSequential(taskPool: TaskPool, options: Omit<Options, 'threads'> = {}): Promise<any[]> {
        await this.#await(() => this.#loaded)

        await this.#checkAvailableThreadSlots()

        const transferData: TransferData = {
            pool: taskPool,
            poolSize: taskPool.pool.length,
            step: options.step,
            throttle: options.throttle
        }

        const thread: Thread = new Thread(this.#executor!, ThreadMode.SEQUENTIAL)
        this.#threads.push(thread)

        const result: any[] = await thread.execute(transferData)

        taskPool.clear()
        this.#threads = []

        return result[0]
    }

    async executeParallel(taskPool: TaskPool, options: Options = {}): Promise<any[] | any> {
        await this.#await(() => this.#loaded)

        const defaultSlots: number = Math.max(1, this.#maxThreadCount - this.#threads.length)
        const threadsToSpawn: number = Math.min(Math.max(1, Math.min(options.threads ?? defaultSlots, this.maxThreadCount)), taskPool.pool.length)
        await this.#checkAvailableThreadSlots(threadsToSpawn)

        const transferData: TransferData = {
            pool: taskPool,
            poolSize: taskPool.pool.length,
            responses: [],
            step: options.step,
            throttle: options.throttle
        }

        const promises: Promise<any>[] = []
        for (let i = 0; i < threadsToSpawn; i++) {
            const thread: Thread = new Thread(this.#executor!, ThreadMode.PARALLEL)
            this.#threads.push(thread)

            promises.push(thread.execute(transferData))
        }

        await Promise.all(promises)

        taskPool.clear()
        this.#threads = []

        return transferData.responses
    }

    async #checkAvailableThreadSlots(minThreadCount: number = 1): Promise<void> {
        if (this.#threads.length > this.#maxThreadCount) {
            await this.#await(() => this.#maxThreadCount - this.#threads.length >= minThreadCount)
        }
    }

    async #await(condition: Function) {
        return new Promise<void>((resolve): void => {
            const interval: NodeJS.Timeout | number = setInterval((): void => {
                if (condition()) {
                    clearInterval(interval)
                    resolve()
                }
            })
        })
    }

    async #load(): Promise<void> {
        Environment.threads()
        this.#executor = await Environment.executor()

        this.#loaded = true
    }


    set maxThreadCount(maxThreadsCount: number) {
        this.#maxThreadCount = Math.max(1, Math.min(maxThreadsCount ?? this.#maxThreadCount, Environment.threads()))
    }

    get maxThreadCount(): number {
        return this.#maxThreadCount
    }
}