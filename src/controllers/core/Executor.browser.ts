import ExecutorInterface, {Command, MessageData} from '../../types/core/Executor'
import {ModifyKey} from '../../types/helpers.ts'


export default class BrowserExecutor implements ExecutorInterface {
    readonly #worker: Worker

    #completedCallback: (message: any) => void = (): void => {}
    #failedCallback: (message: string) => void = (): void => {}

    constructor() {
        const script = `
            self.onmessage = async (message) => {
                const data = message.data
                switch (data.command) {
                    case 'run':
                        try {
                            const fn = new Function('return ' + data.task)()
                            const value = await fn(data.value)
                            postMessage(value)
                        }
                        catch (e) {
                           postMessage({worker_callback_error: e.message}) 
                        }
                        
                        break
                        
                    case 'terminate':
                        self.close()
                        break
                }
            }`

        const bytes: Uint8Array = new TextEncoder().encode(script)
        const blob: Blob = new Blob([bytes], { type: 'application/javascript' })
        const url: string = URL.createObjectURL(blob)

        this.#worker = new Worker(url)

        this.#worker.onmessage = (message: ModifyKey<MessageEvent, 'data', MessageData>): void => {
            return message.data?.worker_callback_error
                ? this.#failedCallback(`Worker callback error occurred: ${message.data.worker_callback_error}. Check the task function for errors.`)
                : this.#completedCallback(message.data)
        }

        this.#worker.onerror = (err: ErrorEvent): void => {
            this.#failedCallback(`Worker internal error occurred: ${err.message}`)
        }
    }


    async run(task: Function, value?: any): Promise<any> {
        return await new Promise<any>((resolve) => {
            // Overwrite the callback to resolve the promise
            this.#completedCallback = (message: any): void => resolve(message)
            this.#failedCallback = (error: string): void => resolve({error})

            this.#worker.postMessage({command: Command.RUN, task: task.toString(), value})
        })
    }

    terminate(): void {
        this.#worker.postMessage({command: Command.TERMINATE})
    }
}