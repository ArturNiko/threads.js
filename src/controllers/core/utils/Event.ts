import ThreadEventInterface, {Type, Entry, Options} from '../../../types/core/utils/Event.ts'

export default class Event implements ThreadEventInterface {
    #events: Map<Type, Entry[]> = new Map()

    on(event: Type, callback: (data: any) => void, options?: Options): void {
        if (!this.#events.has(event)) this.#events.set(event, [])

        this.#events.get(event)!.push({
            callback,
            options
        })
    }

    emit(event: Type, data: any): void {
        if (!this.#events.has(event)) return

        this.#events.get(event)!.forEach((e: Entry, i: number): void => {
            e.callback(data)

            if (e.options?.once) this.#events.get(event)!.splice(i, 1)
        })
    }

}