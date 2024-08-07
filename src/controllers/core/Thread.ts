import Event from './utils/Event.ts'
import Environment from './utils/Environment.ts'

import {Options as EventOptions} from '../../types/core/utils/Event.ts'
import {ThrottleCallback, TransferData} from '../../types/core/Threads.ts'
import ThreadInterface, {Mode, State, EventType} from '../../types/core/Thread.ts'
import {HybridExecutor} from '../../types/core/Executor.ts'
import {Task} from '../../types/partials/TaskPool.ts'



export default class Thread implements ThreadInterface {
    #executor: HybridExecutor

    #state: State = State.IDLE

    #events: Event = new Event()

    constructor(Executor: new() => HybridExecutor) {
        this.#executor = new Executor()
    }

    async execute(data: TransferData, mode: Mode = Mode.SEQUENTIAL): Promise<void> {
        // Prevent execution if the thread is not idle. Most probably an internal error (Dev messed up again ;^D)
        if (this.#state !== State.IDLE) throw `${mode} execution - Thread cannot be executed (Internal Controller Error)`

        this.#state = State.RUNNING

        this.#events.emit(EventType.PROGRESS, this)
        const responses: any[] = data.responses

        const tasks: Task[] = data.pool.pool

        while (data.pool.length && this.#state === State.RUNNING) {
            // Get the next task & remove it from the pool
            const task: Task = tasks.splice(0, 1).at(0)!

            // Sequential mode: set the message to the response of the previous task (if exists)
            if (mode === Mode.SEQUENTIAL) task.message = task?.message ?? responses.at(-1)

            // If throttle is set, wait for its completion. If it fails, terminate the thread
            if (data.throttle) await this.#waitForThrottleSuccess(data.throttle).catch()

            //@ts-ignore
            if(this.#state === State.INTERRUPTED) {
                this.#events.emit(EventType.ERROR, this)

                break
            }

            // Run the task and get the response
            const response = await this.#executor.run(task.method, task.message)

            // Check if the response is an error and gracefully terminate the thread
            if (response?.error) {
                this.#events.emit(EventType.ERROR, this)

                break
            }

            // Save the response
            responses[task.index!] = response

            // Execute the step callback
            const progress: number = responses.filter((response): boolean => response !== undefined).length / data.poolSize
            data.step?.(responses[task.index!], progress)
        }

        this.#state = State.IDLE

        this.#events.emit(EventType.COMPLETE, this)
    }

    terminate(): void {
        this.#executor.terminate()

        this.#state = State.INTERRUPTED
    }

    on(event: EventType, callback: (data: any) => void, options?: EventOptions): void {
        this.#events.on(event, callback, options)
    }

    async #waitForThrottleSuccess(throttle: ThrottleCallback): Promise<void> {
        while (true) {
            if (this.#state === State.INTERRUPTED) break

            try {
                if (await throttle()) break
            }
            catch (e) {
                this.#state = State.INTERRUPTED

                throw `Throttle error: ${e}`
            }

            await Environment.requestAnimationFrame()
        }
    }

    get state(): State {
        return this.#state
    }
}