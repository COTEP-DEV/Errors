//
// Copyright (c) 2016 by Cotep. All Rights Reserved.
//

/*
 * This class handle errors in the app
 */

const colors = require('colors/safe');

/**
 * Create a monoline from an array which is usefull when you have a line that is too long
 */
function monoline(parts: any[]): string {
  return parts.reduce((str: string, x: string) => `${str}${x}`, '');
}

/**
 * Convert a string to JSON
 * If he cannot parse it, return false
 */
function convertStringToJSON(dataString: string): Object | false {
  return (() => {
    try {
      return JSON.parse(dataString);
    } catch (_) {
      return false;
    }
  })();
}

const NUMBER_OF_LEVEL_TO_GO_BACK_ERROR_CLASSIC: number = 3;

const NUMBER_OF_LEVEL_TO_GO_BACK_ERROR_HANDLE_STACK_TRACE: number = 3;

let codesStorage: {
  [key: string]: string;
} | false = false;

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
  constructor(errCode?: string, supString?: string, functionName: string = Errors.getFunctionName(NUMBER_OF_LEVEL_TO_GO_BACK_ERROR_CLASSIC)) {
    this.stringError = '';
    this.errorCode = 'E0000';
    this.happened = '';

    if (errCode) {
      this.errorCode = errCode;

      if (functionName) {
        this.happened = functionName;
      }
    }

    if (supString) {
      this.stringError = supString;
    }

    this.dad = false;
  }

  /**
   * Return the name of the function that call this function
   * IT'S A HACK
   */
  public static getFunctionName(numberFuncToGoBack: number = 1): string {
    const err = new Error('tmpErr');

    const splitted = (err.stack || '')
      .split('\n');

    // If we cannot succeed to find the good function name, return the whole data
    if (numberFuncToGoBack >= splitted.length) {
      return err.stack || '';
    }

    const trimmed = splitted[numberFuncToGoBack]
      .trim();

    // If we cannot succeed to find the good function name, return the whole data
    if (!trimmed.length) {
      return err.stack || '';
    }

    return trimmed.split(' ')[1];
  }

  /**
   * We call this function to add some trace to the error
   * @param error - new Error that will help the trace
   */
  public stackTrace(error: Errors): Errors {
    error.setDad(this);

    return error;
  }

  /**
   * Set a dad to the error (used by stack trace to create a stack trace using simple errors)
   * @param error
   */
  public setDad(error: Errors): void {
    this.dad = error;
  }

  /**
   * We serialize the error to be able to deserialize it after
   * @param {?Boolean} _stringify - do we need to stringify before end? Used to call it recurively
   *
   * WARNING RECURSIVE FUNCTION
   */
  public serialize(_stringify: boolean = true): string | Object {
    const serialize = {
      stringError: this.stringError,
      errorCode: this.errorCode,
      happened: this.happened,
      dad: this.dad ? this.dad.serialize(false) : false,
    };

    return _stringify ? JSON.stringify(serialize) : serialize;
  }

  /**
   * We deserialize a previously serialized error
   * If the string is not a serialized error, create a new error with the string as new error infos
   * @param {String} str
   */
  public static deserialize(str: string): Object {
    const obj = convertStringToJSON(str);

    const constructError = (ptr) => {
      const newErrorObj = new Errors();

      newErrorObj.stringError = ptr.stringError || '';
      newErrorObj.errorCode = ptr.errorCode || 'EUNEXPECTED';
      newErrorObj.happened = ptr.happened || '';

      if (ptr.dad) {
        newErrorObj.dad = constructError(ptr.dad);
      }

      return newErrorObj;
    };

    // If the str is not an Errors serialized data
    if (!obj) {
      return new Errors('UNKNOWN_ERROR', str);
    }

    return constructError(obj);
  }

  /**
   * The default codes of the Error class
   */
  public static get DEFAULT_CODES(): {
    [key: string]: string;
  } {
    return {
      // Special error that say we just want to add some extra stack trace data (but without using new error code)
      ESTACKTRACE: 'Stack Trace',

      // Default error
      E0000: 'No Specified Error',

      // Unexpected error
      EUNEXPECTED: 'Unexpected Error',
    };
  }

  /**
   * Declare codes to the Errors class
   */
  public static declareCodes(conf: {
    [key: string]: string;
  }): void {
    if (!codesStorage) {
      codesStorage = Errors.DEFAULT_CODES;
    }

    codesStorage = {
      ...codesStorage,
      ...conf,
    };
  }

  /**
   * Returns the known codes
   */
  public static get codes(): {
    [key: string]: string;
  } {
    if (!codesStorage) {
      codesStorage = Errors.DEFAULT_CODES;
    }

    return codesStorage;
  }

  /**
   * Shortcut to handle an add to stack trace (special add --> ESTACKTRACE type)
   */
  public static shortcutStackTraceSpecial(err: Errors | Error, funcName: string): Errors {
    return Errors.handleStackTraceAdd(err, new Errors('ESTACKTRACE', '', funcName), funcName);
  }

  /**
   * Add an error into a stack trace, handle the fact of unexpected errors
   */
  public static handleStackTraceAdd(err: Errors | Error, errToAdd: Errors, funcName: string = Errors.getFunctionName(NUMBER_OF_LEVEL_TO_GO_BACK_ERROR_HANDLE_STACK_TRACE)) {
    if (!Errors.staticIsAnError(err)) {
      return new Errors('EUNEXPECTED', String(err.stack || err), funcName);
    }

    return err.stackTrace(errToAdd);
  }

  /**
   * Check if the errCode is a part of the stackTrace errors
   */
  public checkErrorOccur(errCode: string): boolean {
    if (this.errorCode === errCode) {
      return true;
    }

    if (!this.dad) {
      return false;
    }

    return this.dad.checkErrorOccur(errCode);
  }

  public getMeaning(): string {
    return Errors.codes[this.errorCode] || '';
  }

  /**
   * @override
   */
  public toString(): string {
    return this.getErrorString();
  }

  /**
   * Get the string that correspond to the recorded error (its a stringified json)
   */
  public getErrorString(_dad: boolean = false): string {
    const json: any = {};

    let avoid = true;

    if (this.errorCode !== 'ESTACKTRACE' || (!_dad && this.errorCode === 'ESTACKTRACE')) {
      avoid = false;
      json.errorCode = this.errorCode;
      json.errorMeaning = this.getMeaning();

      if (this.stringError) {
        json.moreInfos = this.stringError;
      }

      if (this.happened) {
        json.happenedAt = this.happened;
      }
    }

    if (this.dad) {
      json.dad = this.dad.getErrorString(true);
    }

    if (_dad && avoid) {
      return json.dad;
    }

    if (_dad) {
      return json;
    }

    if (avoid) {
      return JSON.stringify(json.dad);
    }

    return JSON.stringify(json);
  }

  public displayColoredError(): void {
    console.error(this.getColoredErrorString(true));
  }

  public displayError(): void {
    console.error(colors.bold(colors.red(String(this.getErrorString()))));
  }

  /**
   * display the error into the console
   * WARNING THIS FUNCTION IS RECURSIVE
   */
  public getColoredErrorString(isFirst: boolean = true): any {
    const strsParts: string[] = [];
    let dadsDisplay: any[] = [];

    // Get the dad display
    if (this.dad) {
      // Here we have something like [dad, dad, dad, dad, dad, dad] displays with the latests the most high level trace
      dadsDisplay = this.dad.getColoredErrorString(false);
    }

    // Create our own display
    if (isFirst || this.errorCode !== 'ESTACKTRACE') {
      strsParts.push(monoline([
        colors.red('--> Error['),
        colors.yellow(`${this.errorCode}`),
        colors.red(']: ['),
        colors.yellow(`${this.getMeaning()}`),
        colors.red(']\n'),
      ]));
    }

    if (this.stringError) {
      colors.blue(strsParts.push(`More infos: [${this.stringError}]\n`));
    }

    if (this.happened) {
      colors.grey(strsParts.push(`Happened at: [${this.happened}]\n`));
    }

    // If we are the first called function, it means we have to actually handle the display
    if (isFirst) {
      // So have dad to display we have
      // strsParts which is the highest level trace we have
      // [dad, dad, dad, dad] which are the others traces, with the last dad the highest level trace

      // Starting with the highest dad we start the display
      const finalArrayToDisplay: string[] = [];

      let spacesOffset = ' ';

      finalArrayToDisplay.push(monoline([
        colors.red(colors.underline(colors.bold('TRACE: '))),
        colors.red(colors.bold('--------------------------------------------------------------')),
        '\n',
      ]));

      strsParts.forEach(x => finalArrayToDisplay.push(`| ${spacesOffset}${x}`));

      dadsDisplay.forEach((x) => {
        spacesOffset += ' ';

        // When we add it in the final array, we insert the graphical '    ' spaces offset
        x.forEach(y => finalArrayToDisplay.push(`| ${spacesOffset}${y}`));
      });

      finalArrayToDisplay.push(monoline([
        colors.bold(colors.red('---------------------------------------------------------------------')),
        '\n',
      ]));

      return monoline(finalArrayToDisplay);
    }

    // We do not have to handle the display just return our display and our dad display
    let toRet: string[][] = [];

    if (strsParts.length) toRet.push(strsParts);

    if (dadsDisplay.length) {
      toRet = [
        ...toRet,
        ...dadsDisplay,
      ];
    }

    return toRet;
  }

  public static staticIsAnError(unknown: any): unknown is Errors {
    return unknown instanceof Errors;
  }

  /**
   * Set a string to specify more the error
   */
  public setString(error: string): void {
    this.stringError = error;
  }

  public setErrorCode(errCode: string): void {
    this.errorCode = errCode;
  }

  public getLastStringInStack(): string {
    let ptr: Errors = this;

    while (ptr.dad) {
      ptr = ptr.dad;
    }

    return ptr.stringError;
  }

  /**
   * Get the error code (key that refer to the error)
   * The last in the stack
   */
  public getLastErrorCodeInStack(): string {
    let ptr: Errors = this;

    while (ptr.dad) {
      ptr = ptr.dad;
    }

    return ptr.errorCode;
  }

  public getLastErrorInStack(): Errors {
    let ptr: Errors = this;

    while (ptr.dad) {
      ptr = ptr.dad;
    }

    return ptr;
  }

  public getErrorCode(): string {
    return this.errorCode;
  }
}
