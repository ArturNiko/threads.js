import ThreadEventInterface, {Type, Event, Options} from '../../types/core/ThreadEvent'

export default class ThreadEvent implements ThreadEventInterface {
    #events: Map<Type, Event[]> = new Map()

    on(event: Type, callback: (data: any) => void, options?: Options): void {
        if (!this.#events.has(event)) this.#events.set(event, [])

        this.#events.get(event)!.push({
            callback,
            options
        })
    }

    emit(event: Type, data: any): void {
        if (!this.#events.has(event)) return

        this.#events.get(event)!.forEach((threadEvent: Event, i: number): void => {
            threadEvent.callback(data)

            if (threadEvent.options?.once) this.#events.get(event)!.splice(i, 1)
        })
    }

}