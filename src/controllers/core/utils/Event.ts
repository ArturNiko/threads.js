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

        const listeners: Entry[] = this.#events.get(event)!
        const listenersToRemove: number[] = [];

        listeners.forEach((e: Entry, i: number): void => {
            e.callback(data)

            if (e.options?.once) listenersToRemove.push(i)
        })

        // Remove the listeners marked for deletion after iteration
        for (let i = listenersToRemove.length - 1; i >= 0; i--) {
            listeners.splice(listenersToRemove[i], 1)
        }
    }
}