export default interface ExecutorInterface {
    run(task: Function, value?: any): Promise<any>

    terminate(): void
}

export enum Command {
    RUN = 'run',
    TERMINATE = 'terminate',
}