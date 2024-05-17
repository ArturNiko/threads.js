import {Worker as NodeWorker} from 'worker_threads'
import {writeFileSync} from 'fs'
import {tmpdir} from 'os'
import {join} from 'path'
import ExecutorInterface, {Command} from '../../types/core/Executor'


export default class Executor implements ExecutorInterface {
    readonly #worker: NodeWorker

    #completedCallback: (message: any) => void = (): void => {
    }

    constructor() {
        const script = `
            self.onmessage = async (message) => {
                const data = message.data
                switch (data.command) {
                    case 'run':
                        const fn = new Function('return ' + data.task)()
                        const value = await fn(data.value)
                        postMessage(value)
                        break
                    case 'terminate':
                        self.close()
                        break
                }
            }`

        const scriptPath: string = join(tmpdir(), `worker-${Date.now()}.js`)
        writeFileSync(scriptPath, script)

        this.#worker = new NodeWorker(scriptPath)
        this.#worker.on('message', (message: any) => this.#completedCallback(message))
        this.#worker.on('error', (err: Error) => {
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
    }
}