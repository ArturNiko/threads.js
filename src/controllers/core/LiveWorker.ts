import LiveWorkerInterface, {Command} from '../../types/core/LiveWorker'


export default class LiveWorker implements LiveWorkerInterface {
    readonly #worker: Worker

    #callback: (message: any) => void = () => {}

    constructor() {
        const bytes: Uint8Array = new TextEncoder().encode(`
            async function handle(taskResponse) {
                postMessage(await taskResponse)
            }
            
            self.onmessage = (message) => {
                const data = message.data
                
                switch (data.command) {
                    case 'run':
                        try {
                            // Dynamically create the function from the string
                            const fn = new Function('return ' + data.task)()
                            handle(fn(data.value))
                        } catch (error) {
                            postMessage(error)
                            self.close()
                        }
                        break
                    case 'terminate':
                        postMessage('terminated')
                        self.close()
                }
            }`)

        const blob: Blob = new Blob([bytes], {type: 'application/javascript'})
        const url: string = URL.createObjectURL(blob)
        this.#worker = new Worker(url)

        this.#worker.onmessage = (message: MessageEvent): void => {
            // Call the callback with the response (callback is overwritten in the run method)
            this.#callback(message.data)
        }
        this.#worker.onerror = console.error
    }


    async run(task: Function, value?: any): Promise<any> {
        const response: Promise<any> = new Promise<any>((resolve) => {
            // Overwrite the callback to resolve the promise
            this.#callback = (message: any) => {
                resolve(message)
            }
        })

        this.#worker.postMessage({command: Command.RUN, task: task.toString(), value})

        return await response
    }

    terminate(): void {
        this.#worker.postMessage({command: Command.TERMINATE})
    }
}