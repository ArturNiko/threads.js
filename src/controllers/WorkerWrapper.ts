export enum TaskType {
    ONCE = 'once',
    LOOPING = 'looping',
}


enum Command {
    RUN = 'run',
    SET = 'set',
    GET = 'get',
    TERMINATE = 'terminate',
}

interface WorkerWrapperInterface {
    callback(message: any): void

    get worker(): Worker | LoopingWorker

    get message(): any

    get taskType(): TaskType
}

export default class WorkerWrapper implements WorkerWrapperInterface {
    readonly #message?: any
    readonly #taskType: TaskType

    #worker?: Worker | LoopingWorker


    constructor(task: Function, type: TaskType, message?: any) {
        this.#message = message
        this.#taskType = type

        if (this.#taskType === TaskType.ONCE) this.#createOnceExecutableTask(task)
        else if (this.#taskType === TaskType.LOOPING) this.#createExecutableLoopingTask(task)

        return this
    }

    #createOnceExecutableTask(task: Function): void {
        const bytes: Uint8Array = new TextEncoder().encode(`self.onmessage = ${task.toString()}`)
        const blob: Blob = new Blob([bytes], {type: 'application/javascript'})
        const url: string = URL.createObjectURL(blob)
        const worker: Worker = new Worker(url)

        worker.onmessage = async (message: MessageEvent): Promise<void> => {
            this.callback!(message.data)
        }

        worker.onerror = (error: ErrorEvent): void => {
            console.error(error)
        }

        this.#worker = worker
    }

    #createExecutableLoopingTask(task: Function): void {
        this.#worker = new LoopingWorker(task, this.message)
    }

    callback(_: any): void {}

    get worker(): Worker | LoopingWorker {
        return this.#worker!
    }

    get message(): any {
        return this.#message
    }

    get taskType(): TaskType {
        return this.#taskType
    }

}


interface LoopingWorkerInterface {
    callback(message: any): void

    get(): Promise<any>

    set(value: any): void

    run(value: any): void

    terminate(): void

    get worker(): Worker
}

export class LoopingWorker implements LoopingWorkerInterface {
    readonly #worker: Worker

    constructor(task: Function, message?: any) {
        const bytes: Uint8Array = new TextEncoder().encode(`
                let global_action = 'run'
                let global_value = ${message ?? 'undefined'}
                
                self.onmessage = (event) => {
                    switch (event.data.command) {
                        case 'run':
                            global_action = 'run'
                            loop()
                            break
                        case 'set':
                            global_action = 'set'
                            global_value = event.data.value
                            break
                        case 'get':
                            global_action = 'get'
                            break
                        case 'terminate':
                            postMessage(value)
                            cancelAnimationFrame(loop) 
                    }
                }
                
                // Function to start the loop
                function loop() {
                    setInterval(() => {
                        global_value = ${task.name}(global_value)
    
                    // Send the updated value to the main thread
                    if(global_action === 'get') {
                        global_action = 'run'
                        postMessage(global_value)
                    }
                    })
                    
    
                    //requestAnimationFrame(loop)
            }
                
            ${task.toString()}
        `)
        const blob: Blob = new Blob([bytes], {type: 'application/javascript'})
        const url: string = URL.createObjectURL(blob)
        const worker = new Worker(url)

        worker.onmessage = async (message: MessageEvent): Promise<void> => {
            this.callback(message.data)
        }

        this.#worker = worker
    }

    callback(_: any): void {}

    async get(): Promise<any> {
        this.worker.postMessage({command: Command.GET})
        return new Promise<any>((resolve) => {
            this.callback = (message: any) => {
                resolve(message)
            }
        })
    }

    set(value: any) {
        this.worker.postMessage({command: Command.SET, value: value})
    }

    run(value: any) {
        this.worker.postMessage({command: Command.RUN, value: value ?? undefined})
    }

    terminate() {
        this.worker.postMessage({command: Command.TERMINATE})
        this.worker.terminate()
    }


    get worker(): Worker {
        return this.#worker
    }

}