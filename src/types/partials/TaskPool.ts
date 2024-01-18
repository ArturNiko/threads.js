export default interface TaskPoolInterface {
    push(...tasks: (Task | Function)[]): this

    insert(index: number, ...tasks: (Task | Function)[]): this

    replace(index: number, ...tasks: (Task | Function)[]): this

    pop(): this

    remove(index: number, length?: number): this

    clear(): this

    get pool(): Task[]
}


export interface Task {
    index: number
    method: Function
    message?: any
}
