import {Options as EventOptions} from './Event.ts'

export default interface QueueInterface {
    increment(value?: number): number
    push(value: number): void
    clear(): void
    at(index: number): number | undefined
    remove(index: number, length?: number): void
    removeByValue(value: number, length?: number): void
    on(event: EventType, callback: (data: any) => void, options?: EventOptions): void

    get last(): number | undefined
    get length(): number
    get view(): number[]
}

export enum EventType {
    PUSH = 'push',
    REMOVE = 'remove'
}
