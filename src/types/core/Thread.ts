import {TransferData} from './Threads'

import ExecutorInterface from './Executor'


export default interface ThreadInterface {
    execute(data: TransferData): Promise<any[]>

    terminate: ExecutorInterface['terminate']

    state: State
}


export enum State {
    IDLE = 'idle',
    RUNNING = 'running'
}

export enum Mode {
    PARALLEL = 'parallel',
    SEQUENTIAL = 'sequential'
}

