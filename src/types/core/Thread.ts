import {TransferData} from './Threads'


export default interface ThreadInterface {
    execute(data: TransferData): Promise<any[]>

    terminate(): void

    state: State
}


export enum State {
    IDLE = 'idle',
    RUNNING = 'running'
}

export enum Mode {
    PARALLEL = 'parallel',
    SEQUENTIAL = 'sequential',
}

