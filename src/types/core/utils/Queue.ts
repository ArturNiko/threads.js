import {Options as EventOptions} from './Event.ts'

export default interface QueueInterface {
    increment(value?: number): number
    push(value: number): void
    clear(): void
    at(index: number): number | undefined
    last(): number | undefined
    remove(index: number, length?: number): void
    removeByValue(value: number, length?: number): void
    view(): number[]
    on(event: EventType, callback: (data: any) => void, options?: EventOptions): void

    get length(): number
}

export enum EventType {
    PUSH = 'push',
    REMOVE = 'remove'
}
