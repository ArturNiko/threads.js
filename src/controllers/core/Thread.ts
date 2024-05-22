import {ThrottleCallback, TransferData} from '../../types/core/Threads'
import ThreadInterface, {Mode, State} from '../../types/core/Thread'
import {HybridExecutor} from '../../types/core/Executor'
import {Task} from '../../types/partials/TaskPool'


export default class Thread implements ThreadInterface {
    readonly #mode: Mode = Mode.PARALLEL

    #executor: HybridExecutor

    #state: State = State.IDLE

    constructor(Executor: new() => HybridExecutor, mode: Mode) {
        this.#executor = new Executor()
        this.#mode = mode
    }

    async execute(data: TransferData): Promise<any[]> {
        this.#state = State.RUNNING

        const responses: any[] = data?.responses ?? []

        const tasks = data.pool.pool

        while (data.pool.length && this.#state === State.RUNNING) {
            // Get the next task & remove it from the pool
            const task: Task = tasks.splice(0, 1).at(0)!

            // Sequential mode: set the message to the response of the previous task (if exists)
            if (this.#mode === Mode.SEQUENTIAL) task.message = task?.message ?? responses.at(-1)

            // If throttle is set, wait for its completion. If it fails, terminate the thread
            if (data.throttle) await this.#waitForThrottleSuccess(data.throttle).catch(() => {
                console.log(1)
                this.#state = State.IDLE
                this.#executor.terminate()
                throw new Error('Throttle error')
            })

            // Run the task and get the response
            const response = await this.#executor.run(task.method, task.message)

            // Check if the response is an error
            if (response instanceof Error) {
                this.#state = State.IDLE
                this.#executor.terminate()
                throw new Error('Worker error: ' + response.stack)
            }

            // Save the response
            responses[task.index!] = response

            // Execute the step callback
            const progress: number = 100 * responses.filter((response) => response !== undefined).length / data.poolSize
            data.step?.(responses[task.index!], progress)

        }

        this.#state = State.IDLE
        this.#executor.terminate()

        return responses
    }

    terminate(): void {
        this.#state = State.IDLE
    }

    #waitForThrottleSuccess = async (throttle: ThrottleCallback): Promise<void> => {
        return await new Promise<void>(async (resolve) => {
            if (await throttle().catch(e => {
                throw new Error(e)
            })) return resolve()

            const interval: NodeJS.Timeout | number = setInterval(async () => {
                if (await throttle().catch(e => {
                    throw new Error(e)
                })) {
                    clearInterval(interval)
                    resolve()
                }
            }, 50)
        })
    }


    get state(): State {
        return this.#state
    }
}