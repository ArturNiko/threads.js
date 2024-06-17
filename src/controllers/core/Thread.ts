import {ThrottleCallback, TransferData} from '../../types/core/Threads'
import ThreadInterface, {Mode, State, Event, ThreadEvent, ThreadEventsOptions} from '../../types/core/Thread'
import {HybridExecutor} from '../../types/core/Executor'
import {Task} from '../../types/partials/TaskPool'


export default class Thread implements ThreadInterface {
    #executor: HybridExecutor

    #state: State = State.IDLE

    #events: Map<Event, ThreadEvent[]> = new Map()

    constructor(Executor: new() => HybridExecutor) {
        this.#executor = new Executor()
    }

    async execute(data: TransferData, mode: Mode = Mode.SEQUENTIAL): Promise<any[]> {
        if (this.#state !== State.IDLE) throw 'Thread is already running (Internal Controller Error)'

        this.#state = State.RUNNING

        this.#emit(Event.PROGRESS, this)

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
                this.#state = State.IDLE
                this.#executor.terminate()

                this.#emit(Event.ERROR, this)

                break
            }

            // Run the task and get the response
            const response = await this.#executor.run(task.method, task.message)

            // Check if the response is an error and gracefully terminate the thread
            if (response?.error) {
                console.error(response.error)
                this.#emit(Event.ERROR, this)

                break
            }

            // Save the response
            responses[task.index!] = response

            // Execute the step callback
            const progress: number = responses.filter((response) => response !== undefined).length / data.poolSize
            data.step?.(responses[task.index!], progress * 100)
        }

        this.#state = State.IDLE
        this.#executor.terminate()

        this.#emit(Event.COMPLETE, this)

        return responses
    }

    terminate(): void {
        this.#state = State.INTERRUPTED
    }

    on(event: Event, callback: (data: any) => void, options?: ThreadEventsOptions): void {
        if (!this.#events.has(event)) this.#events.set(event, [])

        this.#events.get(event)!.push({
            callback,
            options
        })
    }

    #emit(event: Event, data: any): void {
        if (!this.#events.has(event)) return

        this.#events.get(event)!.forEach((threadEvent: ThreadEvent, i: number): void => {
            threadEvent.callback(data)

            if (threadEvent.options?.once) this.#events.get(event)!.splice(i, 1)
        })
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