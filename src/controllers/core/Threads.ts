import ThreadsInterface, {Options, TransferData} from '../../types/core/Threads'
import {Mode as ThreadMode, State as ThreadState, Event as ThreadEvent} from '../../types/core/Thread'
import {HybridExecutor} from '../../types/core/Executor'

import Thread from './Thread'
import TaskPool from '../partials/TaskPool'
import Environment from '../partials/Environment'


export default class Threads implements ThreadsInterface {
    #threadCount: number = 2
    #loaded: boolean = false
    #threads: Thread[] = []
    #executor: (new() => HybridExecutor) | null = null


    constructor(maxThreads: number = 2) {
        this.#threadCount = maxThreads
    }

    async load(): Promise<Threads> {
        this.#executor = await Environment.executor()

        this.threadCount = this.#threadCount

        this.#loaded = true

        return this
    }

    async executeSequential(taskPool: TaskPool, options: Omit<Options, 'threads'> = {}): Promise<any> {
        if(!this.#loaded) await this.load()

        const transferData: TransferData = {
            pool: taskPool,
            poolSize: taskPool.pool.length,
            step: options.step,
            throttle: options.throttle,
            responses: []
        }

        const thread: Thread = new Thread(this.#executor!)

        await thread.execute(transferData, ThreadMode.SEQUENTIAL)

        taskPool.clear()

        return transferData.responses[0]
    }

    async executeParallel(taskPool: TaskPool, options: Options = {}): Promise<any[] | undefined> {
        if(!this.#loaded) await this.load()

        const threadsToSpawn: number = Math.min(Math.max(1, Math.min(options.threads ?? this.#threadCount, this.threadCount)), taskPool.pool.length)

        // References of this object are passed to the threads, so it's synchronized across them
        const transferData: TransferData = {
            pool: taskPool,
            poolSize: taskPool.pool.length,
            responses: [],
            step: options.step,
            throttle: options.throttle
        }

        await this.#loadAndRun(ThreadMode.PARALLEL, transferData, threadsToSpawn)

        taskPool.clear()

        return transferData.responses
    }

    #setThreads(): void {
        this.#threads.forEach((thread: Thread) => thread.terminate())
        this.#threads = Array(this.#threadCount).fill(new Thread(this.#executor!))
    }

    // Load idle threads first, then awaits for running threads to complete and loads them, if needed.
    async #loadAndRun(mode: ThreadMode, transferData: TransferData, amount: number = 1): Promise<any> {
        const [idleThreads, runningThreads]: [Thread[], Thread[]] = [[], []]

        this.#threads.forEach((thread: Thread): void => {
            if (thread.state === ThreadState.IDLE) idleThreads.push(thread)
            else if (thread.state === ThreadState.RUNNING) runningThreads.push(thread)
        })

        const promises: Promise<any>[] = []

        idleThreads.splice(0, amount).forEach((thread: Thread): void => {
            promises.push(thread.execute(transferData, mode))
            --amount
        })

        if(amount === 0) return await Promise.all(promises)

        runningThreads.splice(0, amount).forEach((thread: Thread): void => {
            thread.on(ThreadEvent.COMPLETE, (thread: Thread): void => {
                if(transferData.pool.pool.length > 0) return

                promises.push(thread.execute(transferData, mode))
            }, {once: true})
        })

        return await Promise.all(promises)
    }

    // CAUTION: All threads will be terminated (also running ones)
    set threadCount(newThreadCount: number) {
        this.#threads.filter((thread: Thread) => thread.state === ThreadState.RUNNING).forEach((thread: Thread) => thread.terminate())

        this.#threadCount = Math.max(1, Math.min(newThreadCount, Environment.threads()))
        this.#setThreads()
    }

    get threadCount(): number {
        return this.#threads.length
    }
}