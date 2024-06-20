import TaskPool from '../../controllers/partials/TaskPool'
import Queue from '../../controllers/core/utils/Queue.ts'


export default interface ThreadsInterface {
    executeSequential(taskPool: TaskPool, options?: Options): Promise<any[]>

    executeParallel(taskPool: TaskPool, options?: Options): Promise<any[]|any>

    set threadCount(maxThreadsCount: number)

    get threadCount(): number
}


export interface TransferData {
    pool: TaskPool
    poolSize: number
    responses: any[]
    step?: StepCallback
    throttle?: ThrottleCallback
}

export interface Options {
    threads?: number
    throttle?: TransferData['throttle']
    step?: TransferData['step']
}

export interface Queues {
    loaded: Queue
    pending: Queue
}


export type StepCallback = (message: any, progress: number) => void
export type ThrottleCallback = () => Promise<boolean> | boolean