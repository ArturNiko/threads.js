import ExecutorInterface from './Executor'


export default interface LiveConnectorInterface extends ExecutorInterface{
    send(message: any): void

    receive(): Promise<any>
}

export enum Command {
    RUN = 'run',
    TERMINATE = 'terminate',
    SEND = 'send',
    RECEIVE = 'receive'
}

export enum Response {
    COMPLETED = 'completed',
    RECEIVE_RESPONSE = 'receive-response'
}

export interface Connectors {
    send: LiveConnectorInterface['send']

    receive: LiveConnectorInterface['receive']

    terminate: LiveConnectorInterface['terminate']
}