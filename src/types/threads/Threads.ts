export default interface ThreadsInterface {
    executeSequential(methods: Task[], options?: Options): Promise<any[]>

    executeParallel(tasks: Task[], options?: Options): Promise<any[]|any>

    dispose(): void

    set maxThreadCount(maxThreadsCount: number)
}


export interface Task {
    index: number
    method: Function
    message?: any
}

export interface TransferData {
    pool: (Task|Function)[]
    poolSize?: number
    responses?: any[]
    step?: Callback
}

export interface Options {
    step?: Callback
    response?: ResponseType
    threads?: number
}


export enum ResponseType {
    FULL = 'full',
    LAST = 'last',
}


type Callback = (message: any, progress: number) => void

