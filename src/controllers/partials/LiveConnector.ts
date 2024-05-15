import LiveConnectorInterface from '../../types/partials/LiveConnector'
export default class LiveConnector implements LiveConnectorInterface {
    #value: any = undefined
    #updated: boolean = false

    update(value: any): void {
        console.warn('This instance is a hollow placeholder')
    }

    modify(value: any): void {
        console.warn('This instance is a hollow placeholder')
    }

    async receive(): Promise<any> {
        return new Promise((resolve): void => {
            console.warn('This instance is a hollow placeholder')
            resolve(undefined)
        })
    }

    send(value: any): void {
        console.warn('This instance is a hollow placeholder')
    }
}