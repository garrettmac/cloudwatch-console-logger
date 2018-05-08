const uuid = require('uuid/v4');
const moment = require('moment');
const correlationId = (global.correlationId = uuid());
/*
  * lets create instances of the console objects as a backup unless we wanna revert back as some point.
  * We do not do this but can if we set an enviornment variable DISABLE_LAMBDA_LOGGER to true.
  * In addtion it's ok to do it here like this as we are binding to them
*/
const consoleLog = console.log.bind(console);
const consoleInfo = console.info.bind(console);
const consoleWarn = console.warn.bind(console);
const consoleError = console.log.bind(console);
// additional declarations
const getLogLevel = (level = 0) =>
  ({
    50: 'CRITICAL',
    40: 'ERROR',
    30: 'WARNING',
    20: 'INFO',
    10: 'DEBUG',
    0: 'NOTSET'
  }[level]);
let loggerMessageObj = {};
/*
 "initCloudwatchConsole" is not wired up now, seems like a bug with node 6.
 AWS seems to run the "handler" silently a few times calling the imported functions
 before they are ready, in this case sets overides before the lambda starts and cloudwatch farts out.
 Works fine when using node 8 and up.
 So when our lambda is running on node 8 we can just add this in our "handler" and that's all we need:
 > "Logger.initCloudwatchConsole( event, context )"
*/
const initCloudwatchConsole = function(event, ctx) {
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
  console.info(`Lambda function '${process.env.AWS_LAMBDA_FUNCTION_NAME}' default log level is set to ${getLogLevel(process.env.LOG_LEVEL)}`);
};
const init = function(o) {
  loggerMessageObj = o;
};
// this is what overrides the console object
const consoleOverride = function() {
  const msg = Array.prototype.slice.call(arguments);
  const asctime = moment().format('YYYY-MM-DD HH:MM:SS,SSS');
  try {
    throw new Error();
  } catch (error) {
    let stackTrace;
    if (!process.env.DISABLE_STACKTRACE) {
      stackTrace = error.stack // Grabs the stack trace
        .split('\n')[2] // Grabs third line
        .trim() // Removes spaces
        .substring(3) // Removes three first characters ("at ")
        .replace(__dirname, '') // Removes script folder path
        .replace(/\s\(./, ' at ') // Removes first parentheses and replaces it with " at "
        .replace(/\)/, ''); // Removes last parentheses
    }
    const { logValue, logMethod } = this;
    const logLevel = getLogLevel(logValue || process.env.LOG_LEVEL);
    const message = msg
      .map(o => (typeof o === 'object' ? JSON.stringify(o) : o))
      .join(' '); // avoid "[lib/ssr-util] [Object Object] scenario"
    if (!message) return;
    // const message = msg.join(' '); // avoid "[lib/ssr-util] [Object Object] scenario"
    process.stdout.write(
      JSON.stringify(
        Object.assign({}, loggerMessageObj, {
          // get component name if console.log statement start with "[" (for example "[component/home] my home")
          get componentName() {
            if (typeof message !== 'string') return undefined;
            const cmptName = message.match(/^\[(.*?)\]/); // grab what is inside "[" and "]" (again only when it start with "[")
            return cmptName ? cmptName.pop() : undefined;
          },
          // output message
          message,
          asctime,
          stackTrace,
          logLevel,
          logMethod,
          logValue
        })
      ) + '\n' // '\n' says exit writing
    );
  }
};
const resetToDefaultConsole = () => {
  global.console.log = consoleLog;
  global.console.info = consoleInfo;
  global.console.warn = consoleWarn;
  global.console.error = consoleError;
};
const overrideConsole = () => {
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
