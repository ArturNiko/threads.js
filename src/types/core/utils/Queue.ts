export default interface QueueInterface {
    push(value: number): void
    at(index: number): number | undefined
    //pushIncrement(from?: number): number
    last(): number | undefined
    splice(index: number, length?: number): void
    spliceByValue(value: number, length?: number): void
    view(): number[]
}

export enum EventType {
    PUSH = 'push',
    REMOVE = 'remove'
}
