import WorkerWrapper, {LiveWorker} from './WorkerWrapper'


export enum State {
    IDLE = 'idle',
    FULL = 'full',
    BUSY = 'busy',
    LIVE = 'live',
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
    push(workerWrapper: WorkerWrapper): this


    execute(executionParams: ExecuteOptionsInterface): Promise<any[]>

    stream(): LiveWorker | undefined

    get pool(): WorkerWrapper[]
}

export default class Thread implements ThreadInterface {
    readonly #limit: number = 32
    readonly #pool: WorkerWrapper[] = []
    readonly #index: number

    state: State = State.IDLE
    executionMode: ExecutionMode


    constructor(index: number, mode?: ExecutionMode) {
        this.#index = index
        this.executionMode = mode ?? ExecutionMode.REGULAR
    }

    push(workerWrapper: WorkerWrapper): this {
        switch (this.state) {
            case State.IDLE:
                this.#pool.push(workerWrapper)
                if (this.#pool.length === this.#limit) this.state = State.FULL
                else if (workerWrapper.worker instanceof LiveWorker) this.state = State.LIVE
                break

            case State.LIVE:
            case State.FULL:
            case State.BUSY:
                console.warn(`Push: Thread with index ${this.#index} is ${this.state}`)
                break
        }

        return this
    }

    async execute(executionParams: ExecuteOptionsInterface): Promise<any[]> {
        if (this.pool.length === 0) {
            console.warn(`Thread with index ${this.#index} has no workers`)
            return []
        }
        else if (this.state === State.BUSY || this.state === State.FULL) {
            console.warn(`Execute: Thread with index ${this.#index} is ${this.state}`)
            return []
        }
        else if (this.state === State.LIVE) {
            console.warn(`Execute: Thread with index ${this.#index} should be streamed via stream() method`)
            return []
        }

        return await this.#executeCall(executionParams)
    }

    stream(): LiveWorker | undefined {
        if (this.state === State.BUSY) {
            console.warn(`Stream: Thread with index ${this.#index} is ${this.state}`)
            return
        }

        else if (this.state !== State.LIVE) {
            console.warn(`Stream: Thread with index ${this.#index} should be set to ${this.state} mode via setLiveThread() method`)
            return
        }

        return this.#streamCall()
    }

    async #executeCall(executionParams: ExecuteOptionsInterface): Promise<any[]> {
        const finalResponse: any[] = []

        let poolTempResponse: any = undefined

        // Create a promise for each worker in the thread
        this.state = State.BUSY
        for (const workerWrapper of this.#pool) {
            await new Promise<void>((resolve) => {
                workerWrapper.callback = (message: any) => {
                    poolTempResponse = message
                    finalResponse.push(message)
                    workerWrapper.worker!.terminate()
                    executionParams.stepCallback?.(message, this)
                    resolve()
                }

                // Send the message to the worker and wait for the workerWrapper.callback to resolve ⤴
                const worker: Worker = workerWrapper.worker as Worker
                worker.postMessage(
                    (executionParams.mode ?? this.executionMode) === ExecutionMode.CHAINED && poolTempResponse
                        ? poolTempResponse
                        : workerWrapper.message
                )
            })
        }

        // Clear the thread
        this.#pool.splice(0, this.#pool.length)
        this.state = State.IDLE

        return (executionParams.mode ?? this.executionMode) === ExecutionMode.CHAINED
            ? [finalResponse[finalResponse.length - 1]]
            : finalResponse
    }

    #streamCall(): LiveWorker {
        this.state = State.BUSY
        const workerWrapper: WorkerWrapper = this.#pool[0]
        return workerWrapper.worker as LiveWorker
    }

    get pool(): WorkerWrapper[] {
        return this.#pool
    }
}