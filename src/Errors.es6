//
// Copyright (c) 2016 by Cotep. All Rights Reserved.
//

/*
 * This class handle errors in the app
 */

import colors from 'colors';

/**
 * Create a monoline from an array which is usefull when you have a line that is too long
 */
function monoline(parts) {
  return parts.reduce((str, x) => `${str}${x}`, '');
}

/**
 * Convert a string to JSON
 * If he cannot parse it, return false
 * @param {String} dataString
 */
function convertStringToJSON(dataString) {
  return (() => {
    try {
      return JSON.parse(dataString);
    } catch (_) {
      return false;
    }
  })();
}

const NUMBER_OF_LEVEL_TO_GO_BACK_ERROR_CLASSIC = 3;

const NUMBER_OF_LEVEL_TO_GO_BACK_ERROR_HANDLE_STACK_TRACE = 3;

/**
 * Handles errors in application. It contains Error codes and functions to manage them
 */
export default class Errors {
  /**
   * @param {String} errCode - the key associated to the error
   * @param {String} functionName - where the error happened
   * @param {String} supString - Supplement infos about the error
   */
  constructor(errCode, supString, functionName = Errors.getFunctionName(NUMBER_OF_LEVEL_TO_GO_BACK_ERROR_CLASSIC)) {
    this.stringError = '';
    this.errorCode = 'E0000';
    this.happened = '';

    if (errCode) {
      this.errorCode = errCode;

      if (functionName) this.happened = functionName;
    }

    if (supString) this.stringError = supString;

    this.dad = false;
  }

  /**
   * Return the name of the function that call this function
   * IT'S A HACK
   */
  static getFunctionName(numberFuncToGoBack = 1) {
    const err = new Error('tmpErr');

    const splitted = err.stack
      .split('\n');

    // If we cannot succeed to find the good function name, return the whole data
    if (numberFuncToGoBack >= splitted.length) {
      return err.stack;
    }

    const trimmed = splitted[numberFuncToGoBack]
      .trim(' ');

    // If we cannot succeed to find the good function name, return the whole data
    if (!trimmed.length) return err.stack;

    return trimmed.split(' ')[1];
  }

  /**
   * We call this function to add some trace to the error
   * @param {Errors} error - new Error that will help the trace
   */
  stackTrace(error) {
    error.setDad(this);

    return error;
  }

  /**
   * Set a dad to the error (used by stack trace to create a stack trace using simple errors)
   * @param {Errors} error
   */
  setDad(error) {
    this.dad = error;
  }

  /**
   * We serialize the error to be able to deserialize it after
   * @param {?Boolean} _stringify - do we need to stringify before end? Used to call it recurively
   *
   * WARNING RECURSIVE FUNCTION
   */
  serialize(_stringify = true) {
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
  static deserialize(str) {
    const obj = convertStringToJSON(str);

    const constructError = (ptr) => {
      const newErrorObj = new Errors();

      newErrorObj.stringError = ptr.stringError || '';
      newErrorObj.errorCode = ptr.errorCode || 'EUNEXPECTED';
      newErrorObj.happened = ptr.happened || '';

      if (ptr.dad) newErrorObj.dad = constructError(ptr.dad);

      return newErrorObj;
    };

    // If the str is not an Errors serialized data
    if (!obj) return new Errors('UNKNOWN_ERROR', str);

    return constructError(obj);
  }

  /**
   * Initialize the codes
   */
  static initCodes() {
    this.codes = {
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
  static declareCodes(conf) {
    if (!this.codes) {
      Errors.initCodes();
    }

    this.codes = {
      ...this.codes,
      ...conf,
    };
  }

  /**
   * Enum that contains errorCodes
   * @return {{EX: number}}
   */
  static get Code() {
    if (!this.codes) {
      Errors.initCodes();
    }

    return this.codes;
  }

  /**
   * Shortcut to handle an add to stack trace (special add --> ESTACKTRACE type)
   * @param {String} funcName
   * @param {?(Errors|Error)} err
   */
  static shortcutStackTraceSpecial(err, funcName) {
    return Errors.handleStackTraceAdd(err, new Errors('ESTACKTRACE', '', funcName), funcName);
  }

  /**
   * Add an error into a stack trace, handle the fact of unexpected errors
   * @param {?(Errors|Error)} err
   * @param {String} funcName
   * @param {Errors} errToAdd
   * @param {Boolean} logIt
   * @param {?Number} type
   */
  static handleStackTraceAdd(err, errToAdd, funcName = Errors.getFunctionName(NUMBER_OF_LEVEL_TO_GO_BACK_ERROR_HANDLE_STACK_TRACE)) {
    if (!Errors.staticIsAnError(err)) return new Errors('EUNEXPECTED', String(err.stack || err), funcName);

    return err.stackTrace(errToAdd);
  }

  /**
   * Check if the errCode is a part of the stackTrace errors
   * @param {String} errCode
   */
  checkErrorOccur(errCode) {
    if (this.errorCode === errCode) return true;

    if (!this.dad) return false;

    return this.dad.checkErrorOccur(errCode);
  }

  /**
   * Get the description associated to the recorded error
   * @return {string}
   */
  getMeaning() {
    return Errors.Code[this.errorCode] || '';
  }

  /**
   * @override
   */
  toString() {
    return this.getErrorString();
  }

  /**
   * Get the string that correspond to the recorded error (its a stringified json)
   * @param {?Boolean} _dad
   * @return {string}
   */
  getErrorString(_dad = false) {
    const json = {};
    let avoid = true;

    if (this.errorCode !== 'ESTACKTRACE' || (!_dad && this.errorCode === 'ESTACKTRACE')) {
      avoid = false;
      json.errorCode = this.errorCode;
      json.errorMeaning = this.getMeaning();

      if (this.stringError) json.moreInfos = this.stringError;

      if (this.happened) json.happenedAt = this.happened;
    }

    if (this.dad) json.dad = this.dad.getErrorString(true);

    if (_dad && avoid) return json.dad;

    if (_dad) return json;

    if (avoid) return JSON.stringify(json.dad);

    return JSON.stringify(json);
  }

  /**
   * Display the colored error
   */
  displayColoredError() {
    console.error(this.getColoredErrorString(true));
  }

  /**
   * display the error into the console
   * WARNING THIS FUNCTION IS RECURSIVE
   * @param {Boolean} isFirst
   */
  getColoredErrorString(isFirst = true) {
    const strsParts = [];
    let dadsDisplay = [];

    // Get the dad display
    if (this.dad) {
      // Here we have something like [dad, dad, dad, dad, dad, dad] displays with the latests the most high level trace
      dadsDisplay = this.dad.getColoredErrorString(false);
    }

    // Create our own display
    if (isFirst || this.errorCode !== 'ESTACKTRACE') {
      strsParts.push(monoline([
        '--> Error['.red,
        `${this.errorCode}`.yellow,
        ']: ['.red,
        `${this.getMeaning()}`.yellow,
        ']\n'.red,
      ]));
    }

    if (this.stringError) strsParts.push(`More infos: [${this.stringError}]\n`.blue);

    if (this.happened) strsParts.push(`Happened at: [${this.happened}]\n`.grey);

    // If we are the first called function, it means we have to actually handle the display
    if (isFirst) {
      // So have dad to display we have
      // strsParts which is the highest level trace we have
      // [dad, dad, dad, dad] which are the others traces, with the last dad the highest level trace

      // Starting with the highest dad we start the display
      const finalArrayToDisplay = [];

      let spacesOffset = ' ';

      finalArrayToDisplay.push(monoline([
        'TRACE: '.bold.underline.red,
        '--------------------------------------------------------------'.bold.red,
        '\n',
      ]));

      strsParts.forEach(x => finalArrayToDisplay.push(`| ${spacesOffset}${x}`));

      dadsDisplay.forEach((x) => {
        spacesOffset += ' ';

        // When we add it in the final array, we insert the graphical '    ' spaces offset
        x.forEach(y => finalArrayToDisplay.push(`| ${spacesOffset}${y}`));
      });

      finalArrayToDisplay.push(monoline([
        '---------------------------------------------------------------------'.bold.red,
        '\n',
      ]));

      return monoline(finalArrayToDisplay);
    }

    // We do not have to handle the display just return our display and our dad display
    let toRet = [];

    if (strsParts.length) toRet.push(strsParts);

    if (dadsDisplay.length) {
      toRet = [
        ...toRet,
        ...dadsDisplay,
      ];
    }

    return toRet;
  }

  /**
   * Display the recorded error
   */
  displayError() {
    console.error(`${this.getErrorString()} - 1`.red.bold);
  }

  /**
   * Say if the parameter is an instance of the class Error
   * @param {Object} unknown
   * @return {Boolean}
   */
  isAnError(unknown) {
    return unknown instanceof Errors;
  }

  /**
   * Say if the parameter is an instance of the class Error
   * @param {Object} unknown
   * @return {Boolean}
   */
  static staticIsAnError(unknown) {
    return unknown instanceof Errors;
  }

  /**
   * Set a string to specify more the error
   * @param {string} error - description of the error
   */
  setString(error) {
    this.stringError = error;
  }

  /**
   * Set the error code
   * @param {String} errCode - key that refer to an error
   */
  setErrorCode(errCode) {
    this.errorCode = errCode;
  }

  /**
   * Get the string associated to the last code in stack
   */
  getLastStringInStack() {
    let ptr = this;

    while (ptr.dad) ptr = ptr.dad;

    return ptr.stringError;
  }

  /**
   * Get the error code (key that refer to the error)
   * The last in the stack
   * @return {String}
   */
  getLastErrorCodeInStack() {
    let ptr = this;

    while (ptr.dad) ptr = ptr.dad;

    return ptr.errorCode;
  }

  /**
   * Get the error
   * The last in the stack
   * @return {String}
   */
  getLastErrorInStack() {
    let ptr = this;

    while (ptr.dad) ptr = ptr.dad;

    return ptr;
  }

  /**
   * Get the error code (key that refer to the error)
   * @return {String}
   */
  getErrorCode() {
    return this.errorCode;
  }
}