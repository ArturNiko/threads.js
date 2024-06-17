import {TransferData} from './Threads'

import ExecutorInterface from './Executor'


export default interface ThreadInterface {
    execute(data: TransferData): Promise<any[]>

    terminate: ExecutorInterface['terminate']

    state: State
}


export enum State {
    IDLE = 'idle',
    RUNNING = 'running',
    INTERRUPTED = 'interrupted'
}

export enum Mode {
    PARALLEL = 'parallel',
    SEQUENTIAL = 'sequential'
}

export enum Event {
    'PROGRESS' = 'progress',
    'COMPLETE' = 'complete',
    'ERROR' = 'error'
}

export interface ThreadEvent {
    callback: Function
    options?: ThreadEventsOptions
}

export interface ThreadEventsOptions {
    once?: boolean
}