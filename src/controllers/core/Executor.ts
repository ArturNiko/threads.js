import ExecutorInterface, {Command} from '../../types/core/Executor'


export default class Executor implements ExecutorInterface {
    readonly #worker: Worker

    #completedCallback: (message: any) => void = (): void => {}

    constructor() {
        const bytes: Uint8Array = new TextEncoder().encode(`
            self.onmessage = async (message) => {
                const data = message.data
                switch (data.command) {
                    case 'run':
                        // Dynamically create a function from the string
                        const fn = new Function('return ' + data.task)()
                        const value = await fn(data.value)

                        postMessage(value)
                        break

                    case 'terminate':
                        self.close()
                        break
                }
            }`)

        const blob: Blob = new Blob([bytes], {type: 'application/javascript'})
        const url: string = URL.createObjectURL(blob)
        this.#worker = new Worker(url)

        this.#worker.onmessage = (message: MessageEvent): void => {
            // Call the callback with the response (callback is overwritten in the run method)
            this.#completedCallback(message.data)
        }
        this.#worker.onerror = (err: ErrorEvent) => {
            throw new Error('Worker internal error occurred ' + err.message)
        }
    }


    async run(task: Function, value?: any): Promise<any> {
        return await new Promise<any>((resolve) => {
            // Overwrite the callback to resolve the promise
            this.#completedCallback = (message: any): void => resolve(message)

            this.#worker.postMessage({command: Command.RUN, task: task.toString(), value})
        })
    }

    terminate(): void {
        this.#worker.postMessage({command: Command.TERMINATE})
    }
}