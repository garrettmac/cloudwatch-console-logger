const consoleLog = console.log.bind(console);
const consoleInfo = console.info.bind(console);
const consoleWarn = console.warn.bind(console);
const consoleError = console.log.bind(console);
// additional declarations
const getLogLevel = (level = 0) =>
  ({
    '50': 'CRITICAL',
    '40': 'ERROR',
    '30': 'WARNING',
    '20': 'INFO',
    '10': 'DEBUG',
    '0': 'NOTSET'
  }[level]);
let getLoggerData = {};
// This overwrites the follow console methods to print nicely for loggly
const initCloudwatchConsole = function(event, ctx){
  getLoggerData = {
    executionEnv: process.env.AWS_EXECUTION_ENV,
    awsLambdaFunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
    awsRegion: process.env.AWS_REGION,
    timeZone: process.env.TZ,
    enviornment: process.env.NODE_ENV,
    'x-amzn-requestid': ctx.awsRequestId,
    'pr-number': process.env.PR || 'UNDEF',
    cookies: event.headers.Cookie,
    headers: event.headers,
    hostName: event.headers.Host
  };
  overrideConsole();
  if (process.env.DISABLE_CONSOLE_OVERIDE){
    resetToDefaultConsole();
  }
  console.info(`Lambda function'${process.env.AWS_LAMBDA_FUNCTION_NAME}' default log level is set to ${getLogLevel(process.env.LOG_LEVEL)}`);
};
const init = function(obj) {
  getLoggerData = obj;
};
// this is what overrides the console object
const consoleOverride = function() {
  let msg = Array.prototype.slice.call(arguments);
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
    // const message = msg.join(' '); // avoid "[lib/ssr-util] [Object Object] scenario"
    process.stdout.write(
      JSON.stringify(
        Object.assign({}, getLoggerData, {
          // get component name if console.log statement start with "[" (for example "[component/home] my home")
          get componentName() {
            if (typeof message !== 'string') return undefined;
            const cmptName = message.match(/^\[(.*?)\]/); // grab what is inside "[" and "]" (again only when it start with "[")
            return cmptName ? cmptName.pop() : undefined;
          },
          // output message
          message,
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
overrideConsole();
global.logger = {
  log: consoleOverride.bind({ logMethod: 'log', logValue: '20' }),
  info: consoleOverride.bind({ logMethod: 'info', logValue: '20' }),
  warn: consoleOverride.bind({ logMethod: 'warn', logValue: '30' }),
  error: consoleOverride.bind({ logMethod: 'error', logValue: '40' })
};

exports.consoleLog = consoleLog;
exports.consoleWarn = consoleWarn;
exports.consoleError = consoleError;
exports.getLoggerData = getLoggerData;
exports.init = init;
exports.initCloudwatchConsole = initCloudwatchConsole;
exports.getLogLevel = getLogLevel;
exports.overrideConsole = overrideConsole;
exports.consoleOverride = consoleOverride;
exports.resetToDefaultConsole = resetToDefaultConsole;
