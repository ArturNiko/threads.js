export default interface EventInterface {
    on(event: string, callback: (data: any) => void, options?: Options): void
    emit(event: string, data: any): void
}

export interface Entry {
    callback: Function
    options?: Options
}

export interface Options {
    once?: boolean
}