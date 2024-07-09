export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type ModifyKey<T, K extends keyof T, V> = Omit<T, K> & { [P in K]: V }