## Lightweight JS tool for managing threads and concurrent task execution
#### Migrated from [`@a4turp/multithreading`](https://www.npmjs.com/package/@a4turp/multithreading)
<br>

### Table of Contents
 - [**Installation**](#installation)
 - [**Initialization**](#initialization)
 - [**Running**](#running)
   - [**Push**](#push)
   - [**Execute**](#execute)
   - [**Note**](#note)
 - [**Getters**](#getters)

### Installation

```bash 
    npm install --save @a4turp/threads.js
```


### Initialization
```typescript
    import Threads from '@a4turp/threads.js'

    // Maximum number of threads is navigator.hardwareConcurrency * 2 - 1
    // Set the maximum number of threads
    const threads = new Threads(12)
```

### Running
The sequence of running tasks on different threads is straightforward.
- Firstly, prepare the data to pass into threads.
- Secondly, execute tasks and wait for the response.

#### Preparation
Here is the showcase of data preparation:

```typescript
import {stringifyQuery} from "ufo";

function square(message) {
   return message * message
}

// Data for parallel and sequential execution
// Data for parallel execution can include a message for each task
const dataParallel = [{method: square, message: 20}, {method: square}, {method: square, message: 0}]
```

#### Execute
Here is the showcase of execution:
```typescript
enum ResponseType {
    ALL = 'ALL',                    // Returns all responses
    LAST = 'LAST'                   // Returns only the last response
}

interface ExecuteOptionsInterface {
    step?: Function                 // Callback function called after each task is executed
    threadCount?: TasksRelation     // Maximum number of threads to execute tasks on
    response: ResponseType          // Response type
}

/**
 *  @param                          options?: ExecuteOptionsInterface
 *  @return                         Promise<any[]|void>
 *  @description                    Executes all tasks in the pool on all threads
 */

await threads.executeParallel({
    threadCount: 4,
    response: ResponseType.ALL,
       
    /**
     * @param                       response: any         Executed task response
     * @param                       progress: number      Progress of execution (0-100)
     *
     */
    step: (response, progress) => console.log(response)
})


/**
 *  @param                          threadIndex: number, options?: ExecuteOptionsInterface
 *  @return                         Promise<any[]|void>
 *  @description                    Executes specified tasks in the pool on specified thread
 */

await threads.execute(0, {
    step: (response, progress) => console.log(response)
})
```

#### Note
- If you want to execute tasks in a specific order, you have to push them in that order.

### Methods
```typescript

/**
 *  @param          threadIndex: number
 *  @return         this
 *  @description    Block specific thread. No more tasks will be inserted on this thread
 *                  Blocked   
 *                  Unblocks itself after the thread is executed
 *  @note           Executes only inserted tasks on this thread!
 */

threads.block(0)


/**
 *  @param          threadIndex: number
 *  @return         this
 *  @description    Terminate all threads (with thier live workers) and clear the pool
 *  @note           Awaits for all threads to finish their tasks
 */

threads.dispose()
```

### Getters
```typescript

interface Getters {
    get pool(): number              // Returns an array of tasks
   
    get threadLoad(): ThreadLoad    // Returns thread load
   
    get threadCount(): number       // Returns the number of threads
}

```