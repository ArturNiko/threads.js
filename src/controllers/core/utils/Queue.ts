import QueueInterface from '../../../types/core/utils/Queue.ts'

export default class Queue  {
    #queue: number[] = []

    get length(): number {
        return this.#queue.length
    }

    increment(value?: number): number {
        value = (value ?? this.last() ?? 0) + 1
        this.#queue.push(value)

        this.#sort()

        return value
    }

    push(value: number): void {
        this.#queue.push(value)
        this.#sort()
    }

    clear(): void {
        this.#queue = []
    }

    at(index: number): number | undefined {
        return this.#queue.at(index)
    }

    last(): number | undefined {
        return this.#queue.at(-1)
    }

    highest(): number | undefined {
        return this.#queue.at(-1)
    }

    splice(index: number, length: number = 1): void {
        this.#queue.splice(index, length)
    }

    spliceByValue(value: number, length: number = 1): void {
        const index: number = this.#queue.indexOf(value)
        if (index === -1) return

        this.#queue.splice(index, length)
    }

    // Copy of the queue
    view(): number[] {
        return this.#queue.slice()
    }

    #sort(): void {
        this.#queue.sort((a: number, b: number): number => a - b)
    }

}
