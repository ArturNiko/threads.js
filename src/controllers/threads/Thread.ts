import ThreadInterface, {Mode, State} from '../../types/threads/Thread'
import {TransferData, Task} from '../../types/threads/Threads'

import LiveWorker from './LiveWorker'

export default class Thread implements ThreadInterface {
    readonly #worker: LiveWorker = new LiveWorker()
    readonly #mode: Mode = Mode.PARALLEL

    #state: State = State.IDLE


    constructor(mode: Mode) {
        this.#mode = mode
    }

    async execute(data: TransferData): Promise<any[]> {
        this.#state = State.RUNNING

        const responses: any[] = data?.responses ?? []
        responses.length = data.poolSize ?? data.pool.length

        while (data.pool.length) {

            // Get the next task & remove it from the pool
            const task: Task = data.pool.splice(0, 1)[0]

            // If the tasks relation is CHAINED, then the message of the next task is the response of the previous task
            if(this.#mode === Mode.SEQUENTIAL) task.message = responses[task.index - 1] ?? task.message

            // Run the task and get the response
            responses[task.index!] = await this.#worker.run(task.method, task.message)

            // Execute the step callback
            const progress: number = 100 * responses.reduce((acc, response) => acc + (response !== undefined ? 1 : 0), 0) / responses.length
            data.step?.(responses[responses.length - 1], progress)
        }

        this.#state = State.IDLE
        return responses
    }

    terminate(): void {
        this.#worker.terminate()
    }

    get state(): State {
        return this.#state
    }
}
