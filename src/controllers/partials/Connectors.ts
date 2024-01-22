export default class Connectors {
    static send: (message: any) => void = () => {
        // Hollow method
    }

    static receive: () => Promise<any> = async () => {
        // Hollow method
        return Promise.resolve(undefined)
    }

}