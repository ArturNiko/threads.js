import QueueInterface from '../../../types/core/utils/Queue.ts'

export default class Queue implements QueueInterface {
    #queue: number[] = []

    get length(): number {
        return this.#queue.length
    }

    push(value: number): void {
        this.#queue.push(value)

        this.#sort()
    }

    at(index: number): number | undefined {
        return this.#queue.at(index)
    }

    pushIncrement(from?: number): number {
        if (from) {
            this.#queue.push(from)
            return from
        }

        if (this.#queue.length === 0) {
            this.#queue.push(0)
            return 0
        }

        const value: number = this.at(- 1)! + 1
        this.#queue.push(value)

        return value
    }

    last(): number | undefined {
        return this.at(-1)
    }

    splice(index: number, length: number = 1): void {
        this.#queue.splice(index, length)
    }

    spliceByValue(value: number, length: number = 1): void {
        const index: number = this.#queue.indexOf(value)
        if (index === -1) return

        this.#queue.splice(index, length)
    }

    view(): number[] {
        return this.#queue.slice()
    }

    #sort(): void {
        this.#queue.sort((a: number, b: number): number => a - b)
    }

}
