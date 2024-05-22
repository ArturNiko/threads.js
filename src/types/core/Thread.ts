import {TransferData} from './Threads'

import ExecutorInterface from './Executor'


export default interface ThreadInterface {
    execute(data: TransferData): Promise<any[]>

    get state(): State

    terminate: ExecutorInterface['terminate']
}


export enum State {
    IDLE = 'idle',
    RUNNING = 'running'
}

export enum Mode {
    PARALLEL = 'parallel',
    SEQUENTIAL = 'sequential'
}