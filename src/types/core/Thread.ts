import {TransferData} from './Threads'

import LiveWorkerInterface from './LiveWorker'


export default interface ThreadInterface {
    execute(data: TransferData): Promise<any[]>

    send: LiveWorkerInterface['send']

    receive: LiveWorkerInterface['receive']

    terminate: LiveWorkerInterface['terminate']

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

