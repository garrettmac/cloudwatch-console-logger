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
var loggerMessageObj = {};
/*
 "initCloudwatchConsole" is not wired up now, seems like a bug with node 6.
 AWS seems to run the "handler" silently a few times calling the imported functions
 before they are ready, in this case sets overides before the lambda starts and cloudwatch farts out.
 Works fine when using node 8 and up.
 So when our lambda is running on node 8 we can just add this in our "handler" and that's all we need:
 > "Logger.initCloudwatchConsole( event, context )"
*/
var initCloudwatchConsole = function initCloudwatchConsole(event, ctx) {
  loggerMessageObj = {
    executionEnv: process.env.AWS_EXECUTION_ENV,
    awsLambdaFunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
    awsRegion: process.env.AWS_REGION,
    timeZone: process.env.TZ,
    enviornment: process.env.NODE_ENV,
    'lambda-request-id': event.requestContext.requestId,
    'x-amzn-requestid': ctx.awsRequestId,
    'x-amz-cf-id': event.headers['X-Amz-Cf-Id'],
    'x-amzn-trace-id': event.headers['X-Amzn-Trace-Id'],
    // TODO: next step is to get a correlation id created by akamai. Not sure how it's passed and I would start by checking the headers when it's in the stage or prod env.
    asctime: moment().format('YYYY-MM-DD HH:MM:SS,SSS'),
    'pr-number': process.env.PR || 'UNDEF',
    cookies: event.headers.Cookie,
    headers: event.headers,
    hostName: event.headers.Host
  };
  overrideConsole();
  if (process.env.DISABLE_CONSOLE_OVERIDE) {
    resetToDefaultConsole();
  }
  console.info('Lambda function \'' + process.env.AWS_LAMBDA_FUNCTION_NAME + '\' default log level is set to ' + getLogLevel(process.env.LOG_LEVEL));
};
var init = function init(o) {
  loggerMessageObj = o;
};
// this is what overrides the console object
var consoleOverride = function consoleOverride() {
  var msg = Array.prototype.slice.call(arguments);
  var asctime = moment().format('YYYY-MM-DD HH:MM:SS,SSS');
  try {
    throw new Error();
  } catch (error) {
    var stackTrace = void 0;
    if (!process.env.DISABLE_STACKTRACE) {
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
    var message = msg.map(function (o) {
      return (typeof o === 'undefined' ? 'undefined' : _typeof(o)) === 'object' ? JSON.stringify(o) : o;
    }).join(' '); // avoid "[lib/ssr-util] [Object Object] scenario"
    if (!message) return;
    // const message = msg.join(' '); // avoid "[lib/ssr-util] [Object Object] scenario"
    process.stdout.write(JSON.stringify(Object.assign({}, loggerMessageObj, {
      // get component name if console.log statement start with "[" (for example "[component/home] my home")
      get componentName() {
        if (typeof message !== 'string') return undefined;
        var cmptName = message.match(/^\[(.*?)\]/); // grab what is inside "[" and "]" (again only when it start with "[")
        return cmptName ? cmptName.pop() : undefined;
      },
      // output message
      message: message,
      asctime: asctime,
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
  if (process.env.DISABLE_CONSOLE_OVERIDE === 'true') return;
  global.console.log = consoleOverride.bind({
    logMethod: 'log',
    logValue: '20'
  });
  global.console.info = consoleOverride.bind({
    logMethod: 'info',
    logValue: '20'
  });
  global.console.warn = consoleOverride.bind({
    logMethod: 'warn',
    logValue: '30'
  });
  global.console.error = consoleOverride.bind({
    logMethod: 'error',
    logValue: '40'
  });
};
global.logger = {
  log: consoleOverride.bind({ logMethod: 'log', logValue: '20' }),
  info: consoleOverride.bind({ logMethod: 'info', logValue: '20' }),
  warn: consoleOverride.bind({ logMethod: 'warn', logValue: '30' }),
  error: consoleOverride.bind({ logMethod: 'error', logValue: '40' })
};
exports.loggerMessageObj = loggerMessageObj;
exports.init = init;
exports.correlationId = correlationId;
exports.initCloudwatchConsole = initCloudwatchConsole;
exports.getLogLevel = getLogLevel;
exports.overrideConsole = overrideConsole;
exports.consoleOverride = consoleOverride;
exports.resetToDefaultConsole = resetToDefaultConsole;