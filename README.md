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

   
    // Maximum number of threads is navigator.hardwareConcurrency * 2 - 1 || 3
    const threads = new Threads(navigator.hardwareConcurrency)
```

### Running
The sequence of running tasks on different threads is straightforward.
- Firstly, push tasks and their parameters (message) into the pool.
- Secondly, execute tasks and wait for the response.

#### Push
Here is the showcase of pushing:
```typescript
    function test(message) {
        let parameter = message
        //Do whatever you want
        return message + 10
    }
    
    /**
     *  @param task: Function, message?: any
     *  @return this
     *  @description Push task
     *
    */

    // Push task with message
    threads.push(test, 10)


    /**
     *  @param task: Function, threadIndex: number, message?: any
     *  @return this
     *  @description Push task on specific thread
     * 
    */
    
    threads.insert(test, 0, 10) 

    /**
     *  @param threadIndex: number
     *  @return this
     *  @description Block thread. No tasks will be inserted on this thread
     *
    */
    
    // Block thread. No tasks will be inserted on this thread
    // Unblocks itself after the thread is executed
    // @note: Executes only inserted tasks on this thread!
    threads.block(0)
```

#### Execute
Here is the showcase of execution:
```typescript
   enum TasksRelation {
    // No relation between tasks
    NONE = 'none',
    // Message of the next task is the response of the previous task
    CHAINED = 'chained'
}

interface ExecuteOptionsInterface {
    // Callback function called after each task is executed
    step?: Function
    // Specifies the relation between tasks
    tasksRelation?: TasksRelation 
}

/**
 *  @param options?: ExecuteOptionsInterface
 *  @return Promise<any[]|void>
 *  @description Executes all tasks in the pool on all threads
 */

await threads.executeAll({
    tasksRelation: 'chained',
    /**
     * @param message: any // Executed task response
     * @param progress: number // Progress of execution (0-100)
     *
     */
    step: (response, progress) => console.log(response)
})


/**
 *  @param threadIndex: number, options?: ExecuteOptionsInterface
 *  @return Promise<any[]|void>
 *  @description Executes specified tasks in the pool on specified thread
 */

await threads.execute(0, {
    step: (response, progress) => console.log(response)
})

```

#### Note
- If you want to execute tasks in a specific order, you have to push them in that order.

### Getters
```typescript

interface Getters {
    // Returns an array of tasks
    get pool(): number

    // Returns thread load
    get threadLoad(): ThreadLoad

    // Returns the number of threads
    get threadCount(): number
}

```

