import {ExecuteOptions} from './Threads'

export default interface ThreadInterface {
    execute(pool: Task[], options?: ExecuteOptions): Promise<any[]>

    block(): void

    get state(): State
}

export interface Settings {
    tasksRelation: TasksRelation
}

export interface Task {
    task: Function
    message?: any
    index: number
    //state: TaskState
    threadIndex?: number
}

export enum State {
    IDLE = 'idle',
    BLOCKED = 'blocked',
    RUNNING = 'running'
}


/*
export enum TaskState {
    READY = 'ready',
    PENDING = 'pending',
    RESOLVED = 'resolved',
    REJECTED = 'rejected',
}
*/

export enum TasksRelation {
    'NONE' = 'none',
    'CHAINED' = 'chained',
}

