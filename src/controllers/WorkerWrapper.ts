import Thread, {ExecutionMode} from './Thread'

export enum TaskType {
    ONCE = 'once',
    LOOPING = 'looping',
}


interface WorkerWrapperInterface {
    readonly message?: any
    readonly taskType: TaskType

    worker?: Worker

    callback(message: any): void
}

export default class WorkerWrapper implements WorkerWrapperInterface {
    readonly message?: any
    readonly taskType: TaskType

    worker?: Worker


    constructor(threads: Thread[], task: Function, type: TaskType, message?: any) {
        this.message = message
        this.taskType = type

        if (this.taskType === TaskType.ONCE) this.#createOnceExecutableTask(threads, task.toString())
        else if (this.taskType === TaskType.LOOPING) this.#createExecutableLoopingTask(threads, task.toString())

        return this
    }

    #createOnceExecutableTask(threads: Thread[], task: string): void {
        const bytes: Uint8Array = new TextEncoder().encode(`self.onmessage = ${task}`)
        const blob: Blob = new Blob([bytes], {type: 'application/javascript'})
        const url: string = URL.createObjectURL(blob)
        const worker: Worker = new Worker(url)

        worker.onmessage = async (message: MessageEvent): Promise<void> => {
            threads.forEach((thread: Thread) => {
                thread.pool.forEach((workerWrapper: WorkerWrapper) => {
                    if (workerWrapper.worker === worker) workerWrapper.callback!(message.data)
                })
            })
        }

        worker.onerror = (error: ErrorEvent): void => {
            console.error(error)
        }

        this.worker = worker
    }

    #createExecutableLoopingTask(threads: Thread[], task: string): void {

    }

    callback(message: any): void {
    }
}

class LoopingTask {
    worker: Worker

    constructor(threads: Thread[], task: Function, message?: any) {
        const bytes: Uint8Array = new TextEncoder().encode(`
                let global_command
                let global_value = ${message ?? 'undefined'}
                
                self.onmessage = (event) => {
                    switch (event.data.command) {
                        case 'run':
                            global_command = 'run'
                            loop()
                            break
                        case 'set':
                            global_command = 'set'
                            global_value = event.data.value
                            break
                        case 'get':
                            global_command = 'get'
                            break
                    }
                }
                
                // Function to start the loop
                function loop() {
                    yourFunction()
    
                // Send the updated value to the main thread
                if(command === 'get') {
                    command = 'run'
                    postMessage(value)
                }
    
                requestAnimationFrame(loop)
            }
                
            ${task.toString()}
        `)
        const blob: Blob = new Blob([bytes], {type: 'application/javascript'})
        const url: string = URL.createObjectURL(blob)
        const worker = new Worker(url)

        worker.onmessage = async (message: MessageEvent): Promise<void> => {
            threads.forEach((thread: Thread) => {
                thread.pool.forEach((workerWrapper: WorkerWrapper) => {
                    if (workerWrapper.worker === worker) workerWrapper.callback!(message.data)
                })
            })
        }

        this.worker = worker
    }

    callback(message: any): void {}

    async get() {
        this.worker.postMessage({command: 'get'})
        await new Promise<void>((resolve) => {
            this.callback = (message: any) => resolve(message)
        })
    }

    set(value: any) {
        this.worker.postMessage({command: 'set', value: value})
    }

    run(value: any) {
        this.worker.postMessage({command: 'set', value: value})
    }


}