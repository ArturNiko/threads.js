import {TransferData} from './Threads'

import ExecutorInterface from './Executor'


export default interface ThreadInterface {
    execute(data: TransferData): Promise<void>

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

export enum EventType {
    'PROGRESS' = 'progress',
    'COMPLETE' = 'complete',
    'ERROR' = 'error'
}
