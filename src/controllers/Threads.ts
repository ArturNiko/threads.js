import Thread, {AllExecuteOptionsInterface, ExecutionMode, State as ThreadState} from './Thread'
import WorkerWrapper, {TaskType} from './WorkerWrapper'

interface TaskOptionsInterface {
    message?: any,
    taskType?: TaskType,
}

interface OptionsInterface {
    executionMode?: ExecutionMode,
}

interface ThreadsInterface {
    readonly threads: Thread[]
    readonly taskCount: number

    execute(options?: AllExecuteOptionsInterface): Promise<any[] | undefined>

    add(task: Function, index: number, options: TaskOptionsInterface): this

    sortIn(task: Function, options?: TaskOptionsInterface): this

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

    async execute(options?: AllExecuteOptionsInterface): Promise<any[] | undefined> {
        if (options?.index !== undefined) {
            const selectedThread: Thread = this.#threads[options.index]
            if (selectedThread === undefined) console.warn(`Execution: Thread with index ${options.index} does not exist`)
            return selectedThread?.execute({mode: options?.mode, stepCallback: options?.stepCallback})
        }


        return this.#flattenFinalResponse(await Promise.all([
            ...this.#threads
                .filter(thread => thread.pool.length > 0 && thread.state !== ThreadState.BUSY)
                .map(thread => thread.execute({mode: options?.mode, stepCallback: options?.stepCallback}))
        ]))
    }

    add(task: Function, index: number, options?: TaskOptionsInterface): this {
        const selectedThread: Thread = this.#threads[index]

        if (!selectedThread) {
            console.warn(`Push: Thread with index ${index} does not exist`)
            return this
        }

        switch (options?.taskType) {
            case undefined:
            case TaskType.ONCE:
                selectedThread.push(new WorkerWrapper(task, TaskType.ONCE, options?.message))
                break

            case TaskType.LOOPING:
                console.info('This is experimental feature. Use it at your own risk')
                if (selectedThread.pool.length === 0) selectedThread.push(new WorkerWrapper( task, TaskType.LOOPING, options.message))
                else console.warn(`Push: Looping task can be pushed only to an empty thread`)
                break

            default:
                console.warn(`Push: Unknown task type ${options?.taskType}`)
        }

        return this
    }


    sortIn(task: Function, options?: TaskOptionsInterface): this {
        switch (options?.taskType) {
            case undefined:
            case TaskType.ONCE:
                const availableThreads: Thread[] = this.#threads.filter(thread => thread.state === ThreadState.IDLE)

                if (availableThreads.length === 0) console.warn(`Push: No available threads`)
                else {
                    const thread: Thread = availableThreads.reduce((thread1: Thread, Thread: Thread) => thread1.pool.length > Thread.pool.length ? Thread : thread1)
                    thread.push(new WorkerWrapper(task, TaskType.ONCE, options?.message))
                }
                break

            case TaskType.LOOPING:
                console.info('This is experimental feature. Use it at your own risk')
                const emptyThread: Thread | undefined = this.#threads.find(thread => thread.pool.length === 0)

                if (emptyThread === undefined) console.warn(`Push: Looping task can be pushed only to an empty thread`)
                else emptyThread.push(new WorkerWrapper(task, TaskType.LOOPING, options?.message))
                break

            default:
                console.warn(`Push: Unknown task type ${options!.taskType}`)
        }

        return this
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

    get threads(): Thread[] {
        return this.#threads
    }

    get taskCount(): number {
        return this.#threads.reduce((count: number, thread: Thread) => count + thread.pool.length, 0)
    }
}