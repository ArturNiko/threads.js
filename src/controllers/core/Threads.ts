import Thread from './Thread'
import TaskPool from '../partials/TaskPool'
import Environment from './utils/Environment.ts'
import Queue from './utils/Queue.ts'

import ThreadsInterface, {Options, Queues, TransferData} from '../../types/core/Threads'
import {Mode as ThreadMode, State as ThreadState} from '../../types/core/Thread.ts'
import {Type as ThreadEventType} from '../../types/core/utils/Event.ts'

import {HybridExecutor} from '../../types/core/Executor'
import {mode} from "happy-dom/lib/PropertySymbol";


export default class Threads implements ThreadsInterface {
    #threadCount: number = 2
    #loaded: boolean = false

    #threads: Thread[] = []
    #executor: (new() => HybridExecutor) | null = null

    #queues: Queues = {
        loaded: new Queue(),
        pending: new Queue()
    }


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

        await this.#loadAndRun(ThreadMode.SEQUENTIAL, transferData, 1)

        return transferData.responses
    }

    async executeParallel(taskPool: TaskPool, options: Options = {}): Promise<any[] | undefined> {
        if (!this.#loaded) {
            console.warn('Please run load() first, to avoid unexpected behavior. Loading now.')
            await this.load()
        }

        let threadsToSpawn: number = Math.min(options.threads ?? this.threadCount, this.threadCount)
        threadsToSpawn = Math.max(1, threadsToSpawn)
        threadsToSpawn = Math.min(threadsToSpawn, taskPool.pool.length)

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


    async #loadAndRun(mode: ThreadMode, transferData: TransferData, amount: number = 1): Promise<any> {
        const index: number = this.#queues.pending.increment(this.#queues.loaded.last())

        const promises: Promise<void>[] = []

        console.warn(index, this.#queues.loaded.view())
        while (transferData.pool.length && --amount) {
            const thread: Thread = await this.#getThread()
            const isNext: boolean = (this.#queues.loaded.highest() ?? 0) + 1 === index

            if(thread.state !== ThreadState.IDLE || !isNext) ++amount
            else if (transferData.pool.length) {
                promises.push(thread.execute(transferData, mode))
            }


            await new Promise(requestAnimationFrame)
        }


        this.#queues.pending.spliceByValue(index)
        this.#queues.loaded.push(index)


        await Promise.all(promises)
    }

    async #getThread(): Promise<Thread> {
        const thread: Thread | undefined = this.#threads.find((thread: Thread): boolean => thread.state === ThreadState.IDLE)

        if (thread) return thread

        return new Promise((resolve): void => {
            for (let i = 0; i < this.#threads.length; i++) {
                this.#threads[i].on(ThreadEventType.COMPLETE, (thread: Thread): void => {
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

    get queues(): Object {
        return {
            loaded: this.#queues.loaded.view(),
            pending: this.#queues.pending.view()
        }
    }
}