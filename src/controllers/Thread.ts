import WorkerWrapper, {LoopingWorker} from './WorkerWrapper'


export enum State {
    IDLE = 'idle',
    FULL = 'full',
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
    push(workerWrapper: WorkerWrapper): this

    execute(executionParams: ExecuteOptionsInterface): Promise<any[]>

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
                if(this.#pool.length === this.#limit || workerWrapper.worker instanceof LoopingWorker) this.state = State.FULL
                break

            case State.FULL:
                console.warn(`Push: Thread with index ${this.#index} is full`)
                break

            case State.BUSY:
                console.warn(`Push: Thread with index ${this.#index} is busy`)
                break
        }


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

        return this.pool[0].worker instanceof LoopingWorker
            ? this.#executeLoop(executionParams.stepCallback)
            : await this.#executeOnce(executionParams)
    }

    async #executeOnce(executionParams: ExecuteOptionsInterface): Promise<any[]> {
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
                console.log(workerWrapper)
                // Send the message to the worker and wait for the workerWrapper.callback to resolve ⤴
                ;(workerWrapper.worker! as Worker).postMessage(
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

    #executeLoop(callback?: Function): Array<LoopingWorker> {
        this.state = State.BUSY
        const workerWrapper: WorkerWrapper = this.#pool[0]
        const worker: LoopingWorker = workerWrapper.worker as LoopingWorker

        worker.run(workerWrapper.message)
        callback?.(workerWrapper.message, this)
        return [worker]
    }
    get pool(): WorkerWrapper[] {
        return this.#pool
    }
}