## Lightweight JS tool for managing threads and concurrent task execution
#### Migrated from [`@a4turp/multithreading`](https://www.npmjs.com/package/@a4turp/multithreading)
<br>

### Table of Contents
 - [**Installation**](#installation)
 - [**Initialization**](#initialization)
 - [**Execution**](#execution)
   - [**Note**](#note)

### Installation

```bash 
    npm install --save @a4turp/threads.js
```


### Initialization

```typescript
    import Threads from '@a4turp/threads.js'

   
    // Maximum number of threads is navigator.hardwareConcurrency -1 || 3
    const threads = new Threads(navigator.hardwareConcurrency, options)
```

#### Options
Several options are available to configure messages and responses during execution. 
Pass them either into the constructor or change them afterward.


```typescript
    enum MessageMode {
        REGULAR = 'regular',
        CHAINED = 'chained'
    }

    enum ResponseMode {
        ALL = 'all',
        LAST = 'last'
    }

    interface OptionsInterface {
        /**
         * Message mode changes message handling for each thread
         * - Chained: task responses are passed into the next task as a message inside 1 thread
         *  - Except the first task (the initial message for the first task is passed)
         * - Regular(default): task messages are passed normally from push
        */
        messageMode?: MessageMode,

        /**
         * Response mode changes the response for each thread
         * - LAST: only the last task response is shown (for each thread)
         * - ALL(default): every task response is shown (for each thread)
        */
        responseMode?: ResponseMode
    }
```

### Execution

The sequence of running tasks on different threads is straightforward.
- Firstly, push tasks and their parameters (message) into thread pools (Workers are created).
- Secondly, execute tasks and wait for the response.


Here is the showcase of execution (5 threads available)
```typescript
    function test(message) {
        let paremeter = message.data
        //Do whatever you want
        postMessage(result)
    }

    interface TaskOptionsInterface  {
        // Task parameter (accessible in message.data)
        message?: any,
        // Push the task into a specific thread
        index?: number
    }
    /**
     *  @param task: Function, options?: TaskOptionsInterface
     *  @return this
     *
     *  There are multiple ways to push the task (function) into a thread.
    */
    threads
            .push(test, {message: 10, index: 0}) // 1st task, 1st thread, message: 10
            .push(test, {index: 0})              // 2nd task, 1st thread, message: none
            .push(test, {index: 1, message: 20}) // 1st task, 2nd thread, message: 20
            .push(test, {index: 1, message: 10}) // 2nd task, 2nd thread, message: 10
            .push(test, {message: 10})           // 1st task, 3rd thread, message: 10
            .push(test, {message: 20})           // 1st task, 4th thread, message: 20
            .push(test)                          // 1st task, 5th thread, message: none
            .push(test)                          // 1st task, 3rd thread, message: none (limit is 5 threads and less busy thread is 3rd one)


    interface ExecuteOptionsInterface extends OptionsInterface{
       // tasks execution on specific thread, if nothing is passed, if nothing is passed, tasks will be executed on all threads.
       index?: number
       // overwrites messageMode property for 1 execution
       messageMode?: MessageMode,
       // overwrites responseMode property for 1 execution
       responseMode?: ResponseMode 
    }
    
    /**
     *  @param options: ExecuteOptionsInterface
     *  @return any[] // basically the value that has been passed into postMessage() method.
    */
    const promises = [
       //execute 1st thread
       await threads.execute({index: 0, messageMode: 'chained', responseMode: 'last'}),
       //execute 2nd thread
       await threads.execute({index: 1}),
       //execute the rest of the threads
       await threads.execute()     
    ]
 
```

#### Note

 - Treat passed function like they are in Worker. ***[Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)***
    - Access passed parameter (message) on `message.data`.
    - Avoid directly modifying the message to prevent potential performance issues.
    - Instead of `return`, use `postMessage(returnValue)`.
   
   
