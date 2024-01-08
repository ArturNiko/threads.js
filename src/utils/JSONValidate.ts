JSON.validate = function (variable: any): boolean{

    return variable && (variable instanceof Object || variable instanceof Array)
}