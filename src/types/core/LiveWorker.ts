import LiveWorker from '../../controllers/core/LiveWorker'

export default interface LiveWorkerInterface {
    run(task: Function, value?: any): Promise<any>

    terminate(): void

    send(message: any): void

    receive(): Promise<any>
}

export enum Command {
    RUN = 'run',
    TERMINATE = 'terminate',
    SEND = 'send',
    RECEIVE = 'receive',
}

export enum Response {
    COMPLETED = 'completed',
    RECEIVE_RESPONSE = 'receive-response',
}

export interface Connectors {
    send: LiveWorkerInterface['send']
    receive: LiveWorkerInterface['receive']
}