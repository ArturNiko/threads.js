import EventInterface, {Entry, Options} from '../../../types/core/utils/Event.ts'

export default class Event implements EventInterface {
    #events: Map<string, Entry[]> = new Map()

    on(event: string, callback: (data: any) => void, options?: Options): void {
        if (!this.#events.has(event)) this.#events.set(event, [])

        this.#events.get(event)!.push({
            callback,
            options
        })
    }

    emit(event: string, data: any): void {
        if (!this.#events.has(event)) return

        this.#events.get(event)!.forEach((e: Entry, i: number): void => {
            e.callback(data)

            if (e.options?.once) this.#events.get(event)!.splice(i, 1)
        })
    }

}