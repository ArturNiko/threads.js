import Thread from './Thread'
import TaskPool from '../partials/TaskPool'
import Environment from './utils/Environment.ts'

import ThreadsInterface, {Options, TransferData} from '../../types/core/Threads'
import {Mode as ThreadMode, State as ThreadState} from '../../types/core/Thread.ts'
import {Type as ThreadEventType} from '../../types/core/utils/Event.ts'

import {HybridExecutor} from '../../types/core/Executor'


export default class Threads implements ThreadsInterface {
    #threadCount: number = 2
    #loaded: boolean = false
    #threads: Thread[] = []
    #executor: (new() => HybridExecutor) | null = null
    #queue: any = []


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
        if (!this.#loaded) {
            console.warn('Please run load() first, to avoid unexpected behavior. Loading now.')
            await this.load()
        }

        const transferData: TransferData = {
            pool: taskPool,
            poolSize: taskPool.length,
            step: options.step,
            throttle: options.throttle,
            responses: []
        }

        await this.#loadAndRun(ThreadMode.SEQUENTIAL, transferData)

        return transferData.responses[0]
    }

    async executeParallel(taskPool: TaskPool, options: Options = {}): Promise<any[] | undefined> {
        if (!this.#loaded) {
            console.warn('Please run load() first, to avoid unexpected behavior. Loading now.')
            await this.load()
        }

        const threadsToSpawn: number = Math.min(Math.max(1, Math.min(options.threads ?? this.#threadCount, this.threadCount)), taskPool.pool.length)

        // References of this object are passed to the threads, so it's synchronized across them
        const transferData: TransferData = {
            pool: taskPool,
            poolSize: taskPool.length,
            responses: [],
            step: options.step,
            throttle: options.throttle
        }

        await this.#loadAndRun(ThreadMode.PARALLEL, transferData, threadsToSpawn)

        return transferData.responses
    }

    terminate(): void {
        this.#threads.forEach((thread: Thread): void => thread.terminate())
    }

    reset(): void {
        this.terminate()
        this.#threads = []

        for (let i = 0; i < this.#threadCount; i++) {
            this.#threads.push(new Thread(this.#executor!))
        }
    }

    // Load idle threads first, then awaits for running threads to complete and loads them, if needed.
    async #loadAndRun(mode: ThreadMode, transferData: TransferData, amount: number = 1): Promise<any> {
        return new Promise<void>(async (resolve) => {
            const promises: Promise<void>[] = []

            const [idleThreads, runningThreads]: [Thread[], Thread[]] = [[], []]


            this.#threads.forEach((thread: Thread): void => {
                if (thread.state === ThreadState.IDLE) idleThreads.push(thread)
                else if (thread.state === ThreadState.RUNNING) runningThreads.push(thread)
            })

            console.log('Running threads:', runningThreads.length, '\nIdle threads:', idleThreads.length)

            idleThreads.splice(0, amount).forEach((thread: Thread): void => {
                promises.push(thread.execute(transferData, mode))
                --amount
            })

            if (amount === 0) {
                await Promise.all(promises)
                resolve()
            }

            const waitForIdleThreadPromises: Promise<void>[] = []
            runningThreads.splice(0, amount).forEach((thread: Thread): void => {
                waitForIdleThreadPromises.push(new Promise<void>((res): void => {
                        thread.on(ThreadEventType.COMPLETE, (thread: Thread): void => {
                            if (!transferData.pool.length) res()

                            promises.push(thread.execute(transferData, mode))
                            res()
                        }, {once: true})
                    })
                )
            })

            await Promise.all(waitForIdleThreadPromises)
            await Promise.all(promises)

            resolve()
        })
    }

    async #loadAndRun2(mode: ThreadMode, transferData: TransferData, amount: number = 1): Promise<any> {
        for(let i = 0; i < amount; i++) {
            const thread: Thread = await this.#getThread()
            await thread.execute(transferData, mode)
        }
    }

    async #getThread(): Promise<Thread> {
        const thread: Thread | undefined = this.#threads.find((thread: Thread): boolean => thread.state === ThreadState.IDLE)

        if (thread) return thread

        return new Promise((resolve): void => {
            for (let i = 0; i < this.#threads.length; i++) {
                const thread = this.#threads[i];
                thread.on(ThreadEventType.COMPLETE, (thread: Thread): void => {
                    resolve(thread)
                }, {once: true})

            }
        })
    }

    set threadCount(newThreadCount: number) {
        this.#threadCount = Math.max(1, Math.min(newThreadCount, Environment.threads()))
        this.reset()
    }

    get threadCount(): number {
        return this.#threads.length
    }
}