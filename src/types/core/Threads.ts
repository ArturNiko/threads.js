import TaskPool from '../../controllers/partials/TaskPool'
import Queue from '../../controllers/core/utils/Queue'

import {State as ThreadState} from './Thread.ts'


export default interface ThreadsInterface {
    executeSequential(taskPool: TaskPool, options?: Options): Promise<any[]>

    executeParallel(taskPool: TaskPool, options?: Options): Promise<any[] | any>

    spawn(threads?: number): Promise<void>

    get state(): State

    get threadCount(): number

    get threadStates(): ThreadState[]
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

export enum State {
    'INITIALIZED' = 'initialized',
    'LOADING' = 'loading',
    'ERROR' = 'error',
    'LOADED' = 'loaded'
}

export type StepCallback = (message: any, progress: number) => void
export type ThrottleCallback = () => Promise<boolean> | boolean