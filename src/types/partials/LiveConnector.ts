export default interface LiveConnectorInterface {
    update(value: any): void

    modify(value: any): void

    receive(): Promise<any>

    send(value: any): void
}