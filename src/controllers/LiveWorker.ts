enum Command {
    RUN = 'run',
    TERMINATE = 'terminate',
}

interface LiveWorkerInterface {
    run(task: Function, value?: any): Promise<any>

    terminate(): void
}

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
                            const fn = new Function('return ' + data.task)()
                            handle(fn(data.value))
                        } catch (error) {
                            console.error('Error in worker:', error)
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