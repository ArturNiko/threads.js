import {Task, Settings} from './Thread'

export default interface ThreadsInterface {
    push(task: Function, message?: any): this

    insert(task: Function, threadIndex: number, message?: any): this

    executeAll(options?: ExecuteOptions): Promise<any[]>

    execute(threadIndex: number, options?: ExecuteOptions): Promise<any[]>

    run(task: Function, message?: any): Promise<any>

    clear(): void

    block(threadIndex: number): void

    get pool(): Task[]

    get threadLoad(): ThreadLoad

    get threadCount(): number
}

export interface ExecuteOptions extends Settings {
    step?: (message: any, progress: number) => void
    poolSize?: number
    responses?: any[]
}

export interface ThreadLoad {
    [key: string]: number
}