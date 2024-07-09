import {TransferData} from './Threads.ts'

import ExecutorInterface from './Executor.ts'


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
