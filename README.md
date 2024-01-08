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
Here is the showcase of pushing
```typescript
    function test(message) {
        let parameter = message
        //Do whatever you want
        return message + 10
    }
    
    /**
     *  @param task: Function, message?: any
     *  @return this
     *
    */

    // Push task with message
    threads.push(test, 10)
```

#### Execute
Here is the showcase of execution
```typescript
   interface ExecuteOptionsInterface {
        // Callback function called after each task is executed
        step?: Function
    }
    
    /**
     *  @param options?: ExecuteOptionsInterface
     *  @return Promise<any[]|void>
     *
    */
    
    /**
    * @param message: any // Executed task response
    * @param index: number // Index of executed task
    * @param totalLength: number // Total number of tasks
    */
    
    // Execute all tasks on all threads with callback function
    await threads.execute({step: (message, index, totalLength) => console.log(response)})

```

### Note
- If you want to execute tasks in a specific order, you have to push them in that order.
- Currently, tasks chaining execution mode is not working.
  - If you want to use it, you can simply roll back to the older version 1.2.1 of this package.

   
   
