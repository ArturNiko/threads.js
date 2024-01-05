import {F} from "vitest/dist/types-e3c9754d";

type WorkWrapperConstructor<T extends TaskType> = T extends TaskType.LIVE
    ? { type: T; } // If T is TaskType.LIVE then task and message are not required
    : { type: T; task: Function; message?: any } // Else task is required, message is optional

export enum TaskType {
    REGULAR = 'regular',
    LIVE = 'live',
}


enum Command {
    RUN = 'run',
    TERMINATE = 'terminate',
}

interface WorkerWrapperInterface {
    callback: (message: any) => void

    get worker(): Worker | LiveWorker

    get message(): any

    get taskType(): TaskType

}

export default class WorkerWrapper implements WorkerWrapperInterface {
    readonly #message?: any
    readonly #taskType: TaskType

    #worker?: Worker | LiveWorker

    callback: (message: any) => void = () => {}


    constructor(options: WorkWrapperConstructor<TaskType>) {
        switch (options.type) {
            case TaskType.REGULAR:
                this.#message = options.message
                this.#taskType = options.type
                this.#createRegularWorker(options.task)
                break
            case TaskType.LIVE:
                this.#taskType = options.type
                this.#createLiveWorker()
                break
            default:
                throw new Error('Unknown task type')
        }

        return this
    }

    #createRegularWorker(task: Function): void {
        const bytes: Uint8Array = new TextEncoder().encode(`self.onmessage = ${task.toString()}`)
        const blob: Blob = new Blob([bytes], {type: 'application/javascript'})
        const url: string = URL.createObjectURL(blob)
        const worker: Worker = new Worker(url)

        worker.onmessage  = (message: MessageEvent): void => {
            this.callback(message.data)
        }
        worker.onerror = console.error

        this.#worker = worker
    }

    #createLiveWorker(): void {
        const bytes: Uint8Array = new TextEncoder().encode(`
            self.onmessage = (message) => {
                switch (message.data.command) {
                    case 'run':
                        eval(\`(\${message.data.task})(\${message.data.value})\`)
                        break
                    case 'terminate':
                        postMessage('terminated')
                        self.close()
                }
            }`)
        const blob: Blob = new Blob([bytes], {type: 'application/javascript'})
        const url: string = URL.createObjectURL(blob)
        this.#worker = new LiveWorker(url)
    }

    get worker(): Worker | LiveWorker {
        return this.#worker!
    }

    get message(): any {
        return this.#message
    }

    get taskType(): TaskType {
        return this.#taskType
    }
}


interface LiveWorkerInterface {
    run(callback: Function, value: any): void

    terminate(): void
}

export class LiveWorker implements LiveWorkerInterface {
    readonly #worker: Worker

    #callback: (message: any) => void = () => {}

    constructor(url: string) {
        this.#worker = new Worker(url)


        this.#worker.onmessage = (message: MessageEvent): void => {
            this.#callback(message.data)
        }
        this.#worker.onerror = console.error
    }


    async run(task: Function, value?: any): Promise<any> {
        const response = new Promise<any>((resolve) => {
            this.#callback = (message: any) => {
                resolve(message)
            }
        })
        this.#worker.postMessage({command: Command.RUN, task: task.toString(), value})

        return await response
    }

    terminate() {
        this.#worker.postMessage({command: Command.TERMINATE})

    }
}