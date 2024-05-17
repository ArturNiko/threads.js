import {Worker as NodeWorker} from 'worker_threads'
import {writeFileSync, unlinkSync} from 'fs'
import {tmpdir} from 'os'
import {join} from 'path'
import ExecutorInterface, {Command} from '../../types/core/Executor'



export default class Executor implements ExecutorInterface {
    readonly #worker: NodeWorker
    readonly #scriptPath: string

    #completedCallback: (message: any) => void = (): void => {}

    constructor() {
        const script = `   
            (async function run() {
                const parentPort = typeof module !== 'undefined' && module.exports 
                    ? require('worker_threads').parentPort 
                    : await import('worker_threads').then((worker) => worker.parentPort)
                 
                console.log(1)     
                parentPort.on('message', async (message) => {
                    console.log(2)               
                    const data = message.data
                    switch (data.command) {
                    case 'run':
                        const fn = new Function('return ' + data.task)()
                        const value = await fn(data.value)
                        parentPort.postMessage(value)
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
        this.#worker.on('message', (message: any) => this.#completedCallback(message))
        this.#worker.on('error', (err: Error) => {
            unlinkSync(this.#scriptPath)
            throw new Error('Worker internal error occurred ' + err.message)
        })


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
        unlinkSync(this.#scriptPath)
    }
}