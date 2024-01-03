export type WorkerWrapper = {
    worker: Worker
    message: any
    callback?: Function
}

export enum State {
    IDLE = 'idle',
    BUSY = 'busy'
}

export enum ExecutionMode {
    REGULAR = 'regular',
    CHAINED = 'chained',
}

export interface AllExecuteOptionsInterface extends ExecuteOptionsInterface {
    index?: number,
}

interface ExecuteOptionsInterface {
    mode?: ExecutionMode,
    stepCallback?: Function

}

interface ThreadInterface {
    push(worker: Worker, message: any, callback?: Function): this

    execute(executionParams: ExecuteOptionsInterface): Promise<any[]>

    get pool(): WorkerWrapper[]
}

export default class Thread implements ThreadInterface {
    readonly #pool: WorkerWrapper[] = []
    readonly #index: number

    state: State = State.IDLE
    executionMode: ExecutionMode


    constructor(index: number, mode?: ExecutionMode) {
        this.#index = index
        this.executionMode = mode ?? ExecutionMode.REGULAR
    }

    push(worker: Worker, message: any, callback?: Function): this {
        if (this.state === State.IDLE) this.#pool.push({worker, message, callback})
        else console.warn(`Push: Thread with index ${this.#index} is busy`)

        return this
    }

    async execute(executionParams: ExecuteOptionsInterface): Promise<any[]> {
        if (this.pool.length === 0) {
            console.warn(`Thread with index ${this.#index} has no workers`)
            return []
        }
        if (this.state === State.BUSY) {
            console.warn(`Execution: Thread with index ${this.#index} is busy`)
            return []
        }

        const finalResponse: any[] = []

        let poolTempResponse: any = undefined

        // Create a promise for each worker in the thread
        this.state = State.BUSY
        for (const workerWrapper of this.#pool) {
            await new Promise<void>((resolve) => {
                workerWrapper.callback = (message: any) => {
                    poolTempResponse = message
                    finalResponse.push(message)
                    workerWrapper.worker.terminate()
                    executionParams.stepCallback?.(message, this)
                    resolve()
                }
                // Send the message to the worker and wait for the workerWrapper.callback to resolve ⤴
                workerWrapper.worker.postMessage(
                    (executionParams.mode ?? this.executionMode) === ExecutionMode.CHAINED && poolTempResponse
                        ? poolTempResponse
                        : workerWrapper.message)
            })
        }

        // Clear the thread
        this.#pool.splice(0, this.#pool.length)
        this.state = State.IDLE

        return (executionParams.mode ?? this.executionMode) === ExecutionMode.CHAINED
            ? [finalResponse[finalResponse.length - 1]]
            : finalResponse
    }

    get pool(): WorkerWrapper[] {
        return this.#pool
    }
}