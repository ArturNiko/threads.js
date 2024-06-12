import {Worker as NodeWorker} from 'worker_threads'
import {writeFileSync, unlinkSync, existsSync} from 'fs'
import {tmpdir} from 'os'
import {join} from 'path'
import ExecutorInterface, {Command} from '../../types/core/Executor'


export default class NodeExecutor implements ExecutorInterface {
    readonly #worker: NodeWorker
    readonly #scriptPath: string

    #completedCallback: (message: any) => void = (): void => {}
    #failedCallback: (error: string) => void = (): void => {}

    constructor() {
        const script = `   
            (async function run() {
                const parentPort = typeof module !== 'undefined' && module.exports 
                    ? require('worker_threads').parentPort 
                    : await import('worker_threads').then((worker) => worker.parentPort)
                    
                parentPort.on('message', async (message) => {
                    switch (message.command) {
                    case 'run':
                        try {
                            const fn = new Function('return ' + message.task)()
                            const value = await fn(message.value)
                            parentPort.postMessage(value)
                        
                        }
                        catch (e) {
                            parentPort.postMessage({worker_callback_error: e.message})
                        }
                        
                        break
                        
                    case 'terminate':
                        parentPort.close()
                        break
                    }
                })
            })().then()`

        this.#scriptPath = join(tmpdir(), `worker-${Date.now()}.js`)
        writeFileSync(this.#scriptPath, script)

        this.#worker = new NodeWorker(this.#scriptPath)
        this.#worker.on('message', (message: any) => {
            return message?.worker_callback_error
                ? this.#failedCallback(`Worker callback error occurred: ${message.worker_callback_error}. Check the task function for errors.`)
                : this.#completedCallback(message)
        })

        this.#worker.on('error', (err: ErrorEvent) => {
            this.#completedCallback({error: `Worker internal error occurred: ${err.message}`})
        })
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
        this.#workerSaveUnlink()
    }

    #workerSaveUnlink(): void {
        if (this.#scriptPath && existsSync(this.#scriptPath)) unlinkSync(this.#scriptPath)
    }
}