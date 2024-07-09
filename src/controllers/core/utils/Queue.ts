import Event from './Event.ts'

import QueueInterface, {EventType} from '../../../types/core/utils/Queue.ts'
import {Options as EventOptions} from '../../../types/core/utils/Event.ts'


export default class Queue implements QueueInterface {
    #queue: number[] = []
    #events: Event = new Event()

    increment(value?: number): number {
        value = (value ?? this.last ?? 0) + 1
        this.#queue.push(value)

        this.#sort()

        return value
    }

    push(value: number): void {
        this.#queue.push(value)
        this.#sort()

        this.#emit(EventType.PUSH, value)
    }

    clear(): void {
        this.#queue = []
    }

    at(index: number): number | undefined {
        return this.#queue.at(index)
    }


    highest(): number | undefined {
        if (!this.#queue.length) return undefined

        return this.#queue.reduce((a: number, b: number): number => a > b ? a : b)
    }

    remove(index: number, length: number = 1): void {
        this.#queue.splice(index, length)

        this.#emit(EventType.REMOVE, index)
    }

    removeByValue(value: number, length: number = 1): void {
        const index: number = this.#queue.indexOf(value)
        if (index === -1) return

        this.remove(index, length)
    }

    // Copy of the queue

    on(event: EventType, callback: (data: any) => void, options?: EventOptions): void {
        this.#events.on(event, callback, options)
    }

    #emit(event: EventType, data: any): void {
        this.#events.emit(event, data)
    }

    #sort(): void {
        this.#queue.sort((a: number, b: number): number => a - b)
    }

    get last(): number | undefined {
        return this.#queue.at(-1)
    }

    get length(): number {
        return this.#queue.length
    }

    get view(): number[] {
        return this.#queue.slice()
    }
}
