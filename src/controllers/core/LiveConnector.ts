import LiveConnectorInterface, {Command, Response} from '../../types/core/LiveConnector'


export default class LiveConnector implements LiveConnectorInterface {
    readonly #worker: Worker

    #completedCallback: (message: any) => void = (): void => {}
    #receiveResponseCallback: (message: any) => void = (): void => {}

    constructor() {
        const bytes: Uint8Array = new TextEncoder().encode(`
            class LiveConnector {
                #value = undefined
                #updated = false

                update(value) {
                    if (value === this.#value) return
                    this.#value = value
                    this.#updated = true
                }

                modify(value) {
                    if (value === this.#value) return
                    this.#value = value
                }

                receive() {
                    if (!this.#updated) return
                    this.#updated = false
                    return this.#value
                }

                send(value) {
                    self.postMessage({response: 'receive-response', value: value ?? this.#value })
                }
            }
        
            const liveConnector = new LiveConnector()
            self.onmessage = async (message) => {
                const data = message.data
                switch (data.command) {
                    case 'run':
                        // Dynamically create a function from the string
                        const fn = new Function('return ' + data.task)()
                        const value = await fn(data.value)

                        postMessage({response: 'completed', value})
                        break

                    case 'receive':
                        liveConnector.update(data.value)
                        break

                    case 'send':
                        liveConnector.send()
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
            if(message.data.response === Response.COMPLETED) this.#completedCallback(message.data.value)
            else if (message.data.response === Response.RECEIVE_RESPONSE) this.#receiveResponseCallback(message.data.value)
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

    send(value: any): void {
        this.#worker.postMessage({command: Command.RECEIVE, value})
    }

    async receive(): Promise<any> {
        return await new Promise<any>((resolve): void => {
            // Overwrite the callback to resolve the promise
            this.#receiveResponseCallback = (message: any): void => resolve(message)

            this.#worker.postMessage({command: Command.SEND})
        })
    }
}