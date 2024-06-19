import Event from './utils/Event.ts'

import {Type as EventType, Options as EventOptions} from '../../types/core/utils/Event.ts'

import {ThrottleCallback, TransferData} from '../../types/core/Threads'
import ThreadInterface, {Mode, State} from '../../types/core/Thread'
import {HybridExecutor} from '../../types/core/Executor'
import {Task} from '../../types/partials/TaskPool'



export default class Thread implements ThreadInterface {
    #executor: HybridExecutor

    #state: State = State.IDLE

    #events: Event = new Event()

    constructor(Executor: new() => HybridExecutor) {
        this.#executor = new Executor()
    }

    async execute(data: TransferData, mode: Mode = Mode.SEQUENTIAL): Promise<void> {

        if (this.#state !== State.IDLE) throw `${mode} execution - Thread cannot be executed (Internal Controller Error)`
        this.#state = State.RUNNING

        this.#emit(EventType.PROGRESS, this)
        const responses: any[] = data.responses

        const tasks: Task[] = data.pool.pool

        while (data.pool.length && this.#state === State.RUNNING) {
            // Get the next task & remove it from the pool
            const task: Task = tasks.splice(0, 1).at(0)!

            // Sequential mode: set the message to the response of the previous task (if exists)
            if (mode === Mode.SEQUENTIAL) task.message = task?.message ?? responses.at(-1)

            // If throttle is set, wait for its completion. If it fails, terminate the thread
            if (data.throttle) await this.#waitForThrottleSuccess(data.throttle).catch()

            //@TODO: fix TS2367
            //@ts-ignore
            if(this.#state === State.INTERRUPTED) {
                this.#emit(EventType.ERROR, this)

                break
            }

            // Run the task and get the response
            const response = await this.#executor.run(task.method, task.message)

            // Check if the response is an error and gracefully terminate the thread
            if (response?.error) {
                this.#emit(EventType.ERROR, this)

                break
            }

            // Save the response
            responses[task.index!] = response

            // Execute the step callback
            const progress: number = responses.filter((response) => response !== undefined).length / data.poolSize
            data.step?.(responses[task.index!], progress * 100)
        }

        this.#state = State.IDLE

        this.#emit(EventType.COMPLETE, this)
    }

    terminate(): void {
        this.#executor.terminate()

        this.#state = State.INTERRUPTED
    }

    on(event: EventType, callback: (data: any) => void, options?: EventOptions): void {
        this.#events.on(event, callback, options)
    }

    #emit(event: EventType, data: any): void {
        this.#events.emit(event, data)
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

            await new Promise(requestAnimationFrame)
        }
    }

    get state(): State {
        return this.#state
    }
}