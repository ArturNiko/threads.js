import {Task} from '../partials/TaskPool'

import TaskPool from '../../controllers/partials/TaskPool'
import LiveConnector from '../../controllers/core/LiveConnector'



export default interface ThreadsInterface {
    executeSequential(taskPool: TaskPool, options?: Options): Promise<any[]>

    executeParallel(taskPool: TaskPool, options?: Options): Promise<any[]|any>

    connect(task: Function, options?: Options): LiveConnector

    dispose(): void

    set maxThreadCount(maxThreadsCount: number)

    get maxThreadCount(): number
}


export interface TransferData {
    pool: Task[]
    poolSize?: number
    responses?: any[]
    step?: Callback
}

export interface Options {
    step?: TransferData['step']
    response?: ResponseType
    threads?: number
}


export enum ResponseType {
    FULL = 'full',
    LAST = 'last',
}


type Callback = (message: any, progress: number) => void

