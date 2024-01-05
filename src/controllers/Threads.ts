import Thread, {AllExecuteOptionsInterface, ExecutionMode, State as ThreadState} from './Thread'
import WorkerWrapper, {LiveWorker, TaskType} from './WorkerWrapper'

interface OptionsInterface {
    executionMode?: ExecutionMode,
}

interface ThreadsInterface {
    readonly threads: Thread[]
    readonly taskCount: number

    add(task: Function, index: number, message?: any): this

    sortIn(task: Function, message?: any): this

    execute(options?: AllExecuteOptionsInterface): Promise<any[] | undefined>

    stream(index: number): LiveWorker | undefined
}

export default class Threads implements ThreadsInterface {
    readonly #threadCount: number
    readonly #threads: Thread[] = []


    constructor(threadCount: number = 3, options?: OptionsInterface) {
        this.#threadCount = Math.max(1, Math.min(threadCount, navigator.hardwareConcurrency - 1))


        // Create threads
        let index: number = 0
        this.#threads = [...Array(this.#threadCount)].map(() => {
            return new Thread(index++, options?.executionMode)
        })
    }

    add(task: Function, index: number, message?: any): this {
        const selectedThread: Thread = this.#threads[index]

        if (!selectedThread) {
            console.warn(`Push: Thread with index ${index} does not exist`)
            return this
        }

        selectedThread.push(new WorkerWrapper({task, type: TaskType.REGULAR, message}))

        return this
    }

    sortIn(task: Function, message?: any): this {
        const availableThreads: Thread[] = this.#threads.filter(thread => thread.state === ThreadState.IDLE)

        if (availableThreads.length === 0) console.warn(`Push: No available threads`)
        else {
            const thread: Thread = availableThreads.reduce((thread1: Thread, Thread: Thread) => thread1.pool.length > Thread.pool.length ? Thread : thread1)
            thread.push(new WorkerWrapper({task, type: TaskType.REGULAR, message}))
        }

        return this
    }

    async execute(options?: AllExecuteOptionsInterface): Promise<any[]> {
        if (options?.index !== undefined) {
            const selectedThread: Thread = this.#threads[options.index]
            if (selectedThread === undefined) console.warn(`Execute: Thread with index ${options.index} does not exist`)
            console.log(selectedThread?.execute({mode: options?.mode, stepCallback: options?.stepCallback}))
            return selectedThread?.execute({mode: options?.mode, stepCallback: options?.stepCallback})
        }

        return this.#flattenFinalResponse(await Promise.all([
            ...this.#threads
                .filter(thread => thread.pool.length > 0 && thread.state === ThreadState.IDLE || thread.state === ThreadState.FULL)
                .map(thread => thread.execute({mode: options?.mode, stepCallback: options?.stepCallback}))
        ]))
    }

    stream(index: number): LiveWorker | undefined {
        const selectedThread: Thread = this.#threads[index]

        if (selectedThread === undefined) console.warn(`Push: Thread with index ${index} does not exist`)
        else {
            selectedThread.pool.splice(0, selectedThread.pool.length)
            selectedThread.push(new WorkerWrapper({type: TaskType.LIVE}))
        }

        return selectedThread.stream()
    }

    #flattenFinalResponse(response: any[][]): any[] {
        const finalResponse: any[] = []
        const longestThreadLength: number = response.reduce((longestLength: number, pool: any[]) => pool.length > longestLength ? pool.length : longestLength, 0)

        for (let i = 0; i < longestThreadLength; i++) {
            response.forEach(threadResponse => {
                if (threadResponse.length > i) finalResponse.push(threadResponse[i])
            })
        }

        return finalResponse
    }

    get threads(): Thread[] {
        return this.#threads
    }

    get taskCount(): number {
        return this.#threads.reduce((count: number, thread: Thread) => count + thread.pool.length, 0)
    }
}