import Thread from './Thread'
import TaskPool from '../partials/TaskPool'
import Environment from './utils/Environment.ts'
import Queue from './utils/Queue.ts'

import ThreadsInterface, {Options, Queues, State, TransferData} from '../../types/core/Threads'
import {Mode as ThreadMode, State as ThreadState} from '../../types/core/Thread.ts'
import {Type as ThreadEventType} from '../../types/core/utils/Event.ts'

import {HybridExecutor} from '../../types/core/Executor'


export default class Threads implements ThreadsInterface {
    readonly #threadCount: number = 2
    #state: State = State.INITIALIZED

    readonly #threads: Thread[] = []
    #executor: (new() => HybridExecutor) | null = null

    #queues: Queues = {
        loaded: new Queue(),
        pending: new Queue()
    }


    constructor(threadCount: number = 2) {
        this.#threadCount = Math.max(1, Math.min(threadCount, Environment.threads()))
    }

    async load(): Promise<Threads> {
        this.#state = State.LOADING
        this.#executor = await Environment.executor()
        this.#state = State.LOADED

        await this.spawn()

        return this
    }

    async executeSequential(taskPool: TaskPool, options: Omit<Options, 'threads'> = {}): Promise<any> {
        if (!(await this.#checkState())) return

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
        if (!(await this.#checkState())) return

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

    async terminate(): Promise<void> {
        if(!this.#threads.length) return

        this.#threads.forEach((thread: Thread): void => thread.terminate())

        const promises: Promise<void>[] = []


        for (let i = 0; i < this.#threads.length; i++) {
            await this.#getThread()
        }

        await Promise.all(promises)
        this.#state = State.TERMINATED
    }

    async spawn(): Promise<void> {
        if (!(await this.#checkState())) return

        if (this.#threads.length) {
            await this.terminate()
            this.#threads.length = 0
        }

        for (let i = 0; i < this.#threadCount; i++) {
            this.#threads.push(new Thread(this.#executor!))
        }
    }

    get threadCount(): number {
        return this.#threads.length
    }

    async #loadAndRun(mode: ThreadMode, transferData: TransferData, amount: number = 1): Promise<any> {
        if(this.#state === State.ERROR) return

        const index: number = this.#queues.pending.increment(this.#queues.loaded.last())

        const promises: Promise<void>[] = []

        while (transferData.pool.length && amount--) {
            const thread: Thread = await this.#getThread()

            const isNext: boolean = (this.#queues.loaded.highest() ?? 0) + 1 === index

            if(thread.state !== ThreadState.IDLE || !isNext) ++amount
            else if (transferData.pool.length) {
                promises.push(thread.execute(transferData, mode).catch((): void => {
                    console.error('An error occurred. Please terminate and respawn the threads.')
                    this.#state = State.ERROR
                }))
            }

            console.log(index)
            //if (index === 4) console.log(amount, transferData.pool.length, index)
            await new Promise(requestAnimationFrame)
        }

        this.#queues.pending.spliceByValue(index)

        if (!this.#queues.pending.length) this.#queues.loaded.clear()
        else this.#queues.loaded.push(index)

        await Promise.all(promises)
    }

    async #checkState(): Promise<boolean> {
        switch (this.#state) {
            case State.INITIALIZED:
                await this.load()
                console.info('Please run load() first, to avoid unexpected behavior. Loading now.')
                return true

            case State.LOADING:
                console.trace('Loading in progress. Please wait.')
                return false

            case State.ERROR:
                throw 'An error occurred. Please terminate and respawn the threads.'

            case State.LOADED:
                return true

            case State.TERMINATED:
                await this.spawn()
                return true
        }
    }

    async #getThread(): Promise<Thread> {
        if (!this.#threads.length) throw 'No threads available'

        const thread: Thread | undefined = this.#threads.find((thread: Thread): boolean => thread.state === ThreadState.IDLE)
        if (thread) return thread

        return new Promise((resolve): void => {
            for (let i = 0; i < this.#threads.length; i++) {
                this.#threads[i]?.on(ThreadEventType.COMPLETE, (thread: Thread): void => {
                    resolve(thread)
                }, {once: true})
            }
        })
    }

    get state(): State {
        return this.#state
    }
}