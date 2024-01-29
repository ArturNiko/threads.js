import {Task} from '../partials/TaskPool'
import {Connectors} from './LiveWorker'

import TaskPool from '../../controllers/partials/TaskPool'


export default interface ThreadsInterface {
    executeSequential(taskPool: TaskPool, options?: Options): Promise<any[]>

    executeParallel(taskPool: TaskPool, options?: Options): Promise<any[]|any>

    dispose(): void

    set maxThreadCount(maxThreadsCount: number)

    get maxThreadCount(): number
}


export interface TransferData {
    pool: Task[]
    poolSize?: number
    responses?: any[]
    step?: Callback
    connect?: (connectors: Connectors) => void
}

export interface Options {
    step?: TransferData['step']
    connect?: TransferData['connect']
    response?: ResponseType
    threads?: number
}


export enum ResponseType {
    FULL = 'full',
    LAST = 'last',
}


type Callback = (message: any, progress: number) => void

