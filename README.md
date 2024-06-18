## Lightweight JS tool for managing threads and concurrent task execution

[![NPM version](https://img.shields.io/npm/v/@a4turp/threads.js)](https://www.npmjs.com/package/@a4turp/threads.js)

#### Migrated from [`@a4turp/multithreading`](https://www.npmjs.com/package/@a4turp/multithreading)

<br>

## Table of Contents

- [**Important ⚠️**](#important-)
- [**Installation**](#installation)
- [**Initialization**](#initialization)
- [**Running**](#running)
    - [**Preparation**](#Preparation)
    - [**Execution**](#Execution)
    - [**Note**](#note)
- [**API**](#api)
- 

## Important ⚠️

- This package is getting updated and restructured frequently. Always check the [**CHANGELOG**](https://github.com/ArturNiko/threads.js/blob/main/CHANGELOG.md) after an update.
- If you have troubles after an update, please check the documentation of the new version or install the previous one.


## Installation

```bash 
    npm install --save @a4turp/threads.js
```
or
```bash 
    pnpm install --save @a4turp/threads.js
```
or
```bash 
    yarn add @a4turp/threads.js
```

## Initialization

```typescript
import Threads from '@a4turp/threads.js'
// Or
const Threads = require('@a4turp/threads.js').default

// Maximum number of threads is calculated as navigator.hardwareConcurrency - 1.
// Set the Maximum number of threads.
const threads = new Threads(12)

// Maximum number of threads can also be set after initialization.
threads.maxThreadCount = 4
```


## Running

The sequence of running tasks on different threads is straightforward.

- Firstly, prepare the data by pushing tasks to the pool.
- Secondly, execute tasks either sequentially or concurrently and wait for the result.


### Preparation

Here is the showcase of data preparation:

```typescript
import {TaskPool} from '@a4turp/threads.js'
// Or
const {TaskPool} = require('@a4turp/threads.js')

function square(message) {
    // If no message is passed, it will be set to 2 by default.
    message = message || 2
    return message * message
}

const tasks = new TaskPool()
tasks.push({method: square, message: 20}, square, {method: square, message: 0}).push({method: square, message: 10})

tasks.insert(2, {method: square, message: 30}, square).insert(0, {method: square, message: 40})
```


### Execution

Here is the showcase of execution:

```typescript
/**
 * @param                            response: any         Executed task response.
 * @param                            progress: number      Progress of execution (0-100) // Helps to track the progress of execution.
 * @description                      Callback function called after each task is executed.
 */
type StepCallback = (message: any, progress: number) => void

/**
 * @description                     This is dynamic throttling function that can be used to control the execution of tasks.
 */
type ThrottleCallback = () => Promise<boolean>|boolean

interface Options {
    threads?: number                 // If in range of 1 and maximum number of threads, tasks will be tried to execute on the specified number of threads.
    throttle?: ThrottleCallback      // Throttle function.
    step?: StepCallback              // Callback function called after each task is executed.
}


/**
 * @param                   tasks: TaskPool, options?: Options
 * @return                  Promise<any[]|void>
 * @description             Executes passed tasks on multiple threads concurrently.
 * @note                    The execution order is not guaranteed, but the results are returned in the order of the tasks.
 */
await threads.executeParallel(tasks, {
    //Options
    threads: 4,
    throttle: () => memoryUsage < 1000000, // Example of throttling function
    step: (response, progress) => console.log(progress)
})

/**
 * @param                   tasks: TaskPool, options?: Options
 * @return                  Promise<any>
 * @description             Executes passed tasks on 1 thread sequentially.
 * @notes                   - The message is passed from the previous task if it is not defined.
 *                          - The execution order is guaranteed.
 *                          - Last task's response is returned.
 */
await threads.executeSequential(tasks)
```


### Note

- Task are always executed in the order they are pushed or inserted to the pool. (Allows you to more control over the execution and if needed collect the results in an expected order)
- Sequential execution runs on 1 thread and is slower than parallel execution.



## API

### Methods
Here is the list of available methods with their types and descriptions:

#### Threads

```typescript

/**
 *  @param                   tasks: TaskPool, options?: Options
 *  @return                  Promise<any[]|void>
 *  @description             Executes passed tasks on multiple threads concurrently.
 */
await threads.executeParallel(tasks, <Options>{
    threads: 4,
    throttle: () => memoryUsage < 1000000,
    step: (response, progress) => console.log(progress)
})
```


```typescript
/**
 *  @param                   tasks: TaskPool, options?: Options
 *  @return                  Promise<any[]|void>
 *  @description             Executes passed tasks on 1 thread sequentially.
 *  @note                    As you saw earlier some tasks may have not any message. In sequential execution,
 *                           the message is passed from the previous task if it is not defined.
 */
await threads.executeSequential(tasks)
```

```typescript
/**
 * @description             Terminate the threads.
 * @note                    Running threads will be terminated gracefully, finished tasks will be outputted.
 */
threads.terminate()
```

```typescript
/**
 * @description             Terminate and reset the threads.
 */
threads.reset()
```


```typescript
/**
 *  @param                   tasks: TaskPool, options?: Options
 *  @return                  Promise<any[]|void>
 *  @description             Executes passed tasks on 1 thread sequentially.
 *  @note                    As you saw earlier some tasks may have not any message. In sequential execution,
 *                           the message is passed from the previous task if it is not defined.
 */
await threads.executeSequential(tasks)
```

```typescript

/**
 * @return                  number
 * @description             Returns the maximum number of threads.
 */

threads.threadCount = 10
```


#### TaskPool

```typescript
/**
 * @param                   index: number, ...task (Task|Function)[]
 * @return                  this
 * @description             Insert tasks at a specific index
 * @note                    If a task is a function, it will be converted to {method: Function, message: undefined}.
 *                          Length of replaced tasks is determined by the number of passed tasks.
 */
tasks.insert(2, <Task>{method: square, message: 30}, square)
     .insert(0, {method: square, message: 40})
```

```typescript
/**
 * @param                    ...task (Task|Function)[]
 * @return                   this
 * @description              Pushes tasks to the pool
 * @note                     If a task is a function, it will be converted to {method: Function, message: undefined}.
 *                           You can push all tasks at once or one by one.
 */
tasks.push({method: square, message: 20}, square, {method: square, message: 0})
     .push({method: square, message: 10})
```

```typescript
/**
 *  @param                   index: number, ...task (Task|Function)[]
 *  @return                  this
 *  @description             Replace tasks from a specific index.
 *  @note                    Length is determined by the number of passed tasks.
 */

tasks.replace(2, {method: square, message: 30})
```


```typescript
/**
 *  @param                   index: number, length?: number
 *  @return                  this
 *  @description             Grab tasks from a specific index out of the pool.
 */
tasks.grab(1, 3)

```

```typescript
/**
 *  @return                  this
 *  @description             Remove the last task.
 */
tasks.pop()
```


```typescript
/**
 *  @return                  this
 *  @description             Remove the first task.
 */
tasks.shift()
```

```typescript
/**
 *  @param                   index: number, length?: number
 *  @return                  this
 *  @description             Remove tasks from a specific index. Length default is 1.
 */
tasks.remove(2, 2)
```

```typescript
/**
 *  @return                  this
 *  @description             Clear the pool
 */
tasks.clear()
```

```typescript
/**
 * @return                  Array<Task>
 * @description             Returns the pool array.
 * @note                    Readonly
 */

tasks.pool
```

```typescript
/**
 * @return                  number
 * @description             Returns the number of tasks in the pool.
 * @note                    Readonly
 */

tasks.length
```


## Deprecated

- `execute` method is deprecated. Use `executeParallel` or `executeSequential` instead.
- `dispose` method is deprecated. Threads are getting terminated gracefully after the execution is finished.
- `ResponseType` execution option is deprecated.
