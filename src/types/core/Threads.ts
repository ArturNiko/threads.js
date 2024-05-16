import TaskPool from '../../controllers/partials/TaskPool'


export default interface ThreadsInterface {
    executeSequential(taskPool: TaskPool, options?: Options): Promise<any[]>

    executeParallel(taskPool: TaskPool, options?: Options): Promise<any[]|any>

    set maxThreadCount(maxThreadsCount: number)

    get maxThreadCount(): number
}


export interface TransferData {
    pool: TaskPool
    poolSize: number
    responses?: any[]
    step?: StepCallback
    throttle?: ThrottleCallback
}

export interface Options {
    threads?: number
    throttle?: TransferData['throttle']
    step?: TransferData['step']
}


export type StepCallback = (message: any, progress: number) => void
export type ThrottleCallback = (() => Promise<boolean>) | (() => boolean)