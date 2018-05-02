'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var uuid = require('uuid/v4');
var moment = require('moment');
var correlationId = global.correlationId = uuid();
/*
  * lets create instances of the console objects as a backup unless we wanna revert back as some point.
  * We do not do this but can if we set an enviornment variable DISABLE_LAMBDA_LOGGER to true.
  * In addtion it's ok to do it here like this as we are binding to them
*/
var consoleLog = console.log.bind(console);
var consoleInfo = console.info.bind(console);
var consoleWarn = console.warn.bind(console);
var consoleError = console.log.bind(console);
// additional declarations
var getLogLevel = function getLogLevel() {
  var level = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  return {
    50: 'CRITICAL',
    40: 'ERROR',
    30: 'WARNING',
    20: 'INFO',
    10: 'DEBUG',
    0: 'NOTSET'
  }[level];
};
var getLoggerData = {};
// This overwrites the follow console methods to print nicely for loggly
var initCloudwatchConsole = function initCloudwatchConsole(context, event) {
  getLoggerData = {
    executionEnv: process.env.AWS_EXECUTION_ENV,
    repoName: 'ecom-web-app',
    awsLambdaFunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
    awsRegion: process.env.AWS_REGION,
    timeZone: process.env.TZ,
    enviornment: process.env.NODE_ENV,
    'lambda-request-id': context.requestContext.requestId,
    'x-amzn-requestid': event.awsRequestId,
    'x-amz-cf-id': context.headers['X-Amz-Cf-Id'],
    'x-amzn-trace-id': context.headers['X-Amzn-Trace-Id'],
    // TODO: next step is to get a correlation id created by akamai. Not sure how it's passed and I would start by checking the headers when it's in the stage or prod env.
    asctime: moment().format('YYYY-MM-DD HH:MM:SS,SSS'),
    'x-lll-ecom-correlation-id': correlationId,
    'pr-number': process.env.PR || 'UNDEF',
    cookies: context.headers.Cookie,
    headers: context.headers,
    allHeaders: global.headers,
    hostName: context.headers.Host
  };
  if (process.env.ENABLE_CONSOLE_OVERIDE) {
    overrideConsole();
  }
  console.info('Lambda function\'' + process.env.AWS_LAMBDA_FUNCTION_NAME + '\' default log level is set to ' + getLogLevel(process.env.LOG_LEVEL));
};
// this is what overrides the console object
var consoleOverride = function consoleOverride() {
  try {
    throw new Error();
  } catch (error) {
    var stackTrace = void 0;
    if (process.env.ENABLE_STACKTRACE) {
      stackTrace = error.stack // Grabs the stack trace
      .split('\n')[2] // Grabs third line
      .trim() // Removes spaces
      .substring(3) // Removes three first characters ("at ")
      .replace(__dirname, '') // Removes script folder path
      .replace(/\s\(./, ' at ') // Removes first parentheses and replaces it with " at "
      .replace(/\)/, ''); // Removes last parentheses
    }
    var logValue = this.logValue,
        logMethod = this.logMethod;

    var logLevel = getLogLevel(logValue || process.env.LOG_LEVEL);

    for (var _len = arguments.length, msg = Array(_len), _key = 0; _key < _len; _key++) {
      msg[_key] = arguments[_key];
    }

    var message = msg.map(function (o) {
      return (typeof o === 'undefined' ? 'undefined' : _typeof(o)) === 'object' ? JSON.stringify(o) : o;
    }).join(' '); // avoid "[lib/ssr-util] [Object Object] scenario"
    // const message = msg.join(' '); // avoid "[lib/ssr-util] [Object Object] scenario"
    process.stdout.write(JSON.stringify(Object.assign({}, getLoggerData, {
      // get component name if console.log statement start with "[" (for example "[component/home] my home")
      get componentName() {
        if (typeof message !== 'string') return undefined;
        var cmptName = message.match(/^\[(.*?)\]/); // grab what is inside "[" and "]" (again only when it start with "[")
        return cmptName ? cmptName.pop() : undefined;
      },
      // output message
      message: message,
      stackTrace: stackTrace,
      logLevel: logLevel,
      logMethod: logMethod,
      logValue: logValue
    })) + '\n' // '\n' says exit writing
    );
  }
};
var resetToDefaultConsole = function resetToDefaultConsole() {
  global.console.log = consoleLog;
  global.console.info = consoleInfo;
  global.console.warn = consoleWarn;
  global.console.error = consoleError;
};
var overrideConsole = function overrideConsole() {
  global.console = {
    log: consoleOverride.bind({ logMethod: 'log', logValue: '20' }),
    info: consoleOverride.bind({ logMethod: 'info', logValue: '20' }),
    warn: consoleOverride.bind({ logMethod: 'warn', logValue: '30' }),
    error: consoleOverride.bind({ logMethod: 'error', logValue: '40' }),
    critical: consoleOverride.bind({ logMethod: 'critical', logValue: '50' })
  };
};
global.logger = {
  log: consoleOverride.bind({ logMethod: 'log', logValue: '20' }),
  info: consoleOverride.bind({ logMethod: 'info', logValue: '20' }),
  warn: consoleOverride.bind({ logMethod: 'warn', logValue: '30' }),
  error: consoleOverride.bind({ logMethod: 'error', logValue: '40' }),
  critical: consoleOverride.bind({ logMethod: 'critical', logValue: '50' })
};
exports.consoleLog = consoleLog;
exports.consoleWarn = consoleWarn;
exports.consoleError = consoleError;
exports.getLoggerData = getLoggerData;
exports.getLogLevel = getLogLevel;
exports.overrideConsole = overrideConsole;
exports.initCloudwatchConsole = initCloudwatchConsole;
exports.consoleOverride = consoleOverride;
exports.resetToDefaultConsole = resetToDefaultConsole;