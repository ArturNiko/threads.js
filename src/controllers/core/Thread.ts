import ThreadInterface, {Mode, State} from '../../types/core/Thread'
import {TransferData} from '../../types/core/Threads'
import {Task} from '../../types/partials/TaskPool'

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
            if(this.#mode === Mode.SEQUENTIAL) task.message = task.message ?? responses[task.index - 1]

            // Run the task and get the response
            const response = await this.#worker.run(task.method, task.message)

            // Check if the response is an error
            if (response instanceof Error) throw new Error('Worker error: ' + response.stack)

            // Save the response
            responses[task.index!] = response

            // Execute the step callback
            const progress: number = 100 * responses.filter((response) => response !== undefined).length / responses.length
            data.step?.(responses[task.index!], progress)
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
