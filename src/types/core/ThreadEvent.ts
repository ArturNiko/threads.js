export default interface ThreadEventInterface {
    on(event: Type, callback: (data: any) => void, options?: Options): void
    emit(event: Type, data: any): void
}
export enum Type {
    'PROGRESS' = 'progress',
    'COMPLETE' = 'complete',
    'ERROR' = 'error'
}

export interface Event {
    callback: Function
    options?: Options
}

export interface Options {
    once?: boolean
}