import BrowserExecutor from '../../controllers/core/Executor.browser.ts'
import NodeExecutor from '../../controllers/core/Executor.node.ts'

export default interface ExecutorInterface  {
    run(task: Function, value?: any): Promise<any>

    terminate(): void
}

export enum Command {
    RUN = 'run',
    TERMINATE = 'terminate'
}

export type HybridExecutor = (BrowserExecutor | NodeExecutor)

export interface MessageData {
    worker_callback_error?: string
}