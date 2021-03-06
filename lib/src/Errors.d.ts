/**
 * Handles errors in application. It contains Error codes and functions to manage them
 */
export default class Errors {
    protected stringError: string;
    protected errorCode: string;
    protected happened: string;
    protected dad: Errors | false;
    /**
     * @param errCode - the key associated to the error
     * @param functionName - where the error happened
     * @param supString - Supplement infos about the error
     */
    constructor(errCode?: string, supString?: string, functionName?: string);
    /**
     * Return the name of the function that call this function
     * IT'S A HACK
     */
    static getFunctionName(numberFuncToGoBack?: number): string;
    /**
     * We call this function to add some trace to the error
     * @param error - new Error that will help the trace
     */
    stackTrace(error: Errors): Errors;
    /**
     * Set a dad to the error (used by stack trace to create a stack trace using simple errors)
     * @param error
     */
    setDad(error: Errors): void;
    /**
     * We serialize the error to be able to deserialize it after
     * @param {?Boolean} _stringify - do we need to stringify before end? Used to call it recurively
     *
     * WARNING RECURSIVE FUNCTION
     */
    serialize(_stringify?: boolean): string | Object;
    /**
     * We deserialize a previously serialized error
     * If the string is not a serialized error, create a new error with the string as new error infos
     * @param {String} str
     */
    static deserialize(str: string): Object;
    /**
     * The default codes of the Error class
     */
    static get DEFAULT_CODES(): {
        [key: string]: string;
    };
    /**
     * Declare codes to the Errors class
     */
    static declareCodes(conf: {
        [key: string]: string;
    }): void;
    /**
     * Returns the known codes
     */
    static get codes(): {
        [key: string]: string;
    };
    /**
     * Shortcut to handle an add to stack trace (special add --> ESTACKTRACE type)
     */
    static shortcutStackTraceSpecial(err: Errors | Error, funcName: string): Errors;
    /**
     * Add an error into a stack trace, handle the fact of unexpected errors
     */
    static handleStackTraceAdd(err: Errors | Error, errToAdd: Errors, funcName?: string): Errors;
    /**
     * Check if the errCode is a part of the stackTrace errors
     */
    checkErrorOccur(errCode: string): boolean;
    getMeaning(): string;
    /**
     * @override
     */
    toString(): string;
    /**
     * Get the string that correspond to the recorded error (its a stringified json)
     */
    getErrorString(_dad?: boolean): string;
    displayColoredError(): void;
    displayError(): void;
    /**
     * display the error into the console
     * WARNING THIS FUNCTION IS RECURSIVE
     */
    getColoredErrorString(isFirst?: boolean): any;
    static staticIsAnError(unknown: any): unknown is Errors;
    /**
     * Set a string to specify more the error
     */
    setString(error: string): void;
    setErrorCode(errCode: string): void;
    getLastStringInStack(): string;
    /**
     * Get the error code (key that refer to the error)
     * The last in the stack
     */
    getLastErrorCodeInStack(): string;
    getLastErrorInStack(): Errors;
    getErrorCode(): string;
}
