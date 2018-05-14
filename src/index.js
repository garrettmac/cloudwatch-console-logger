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
const setCloudWatchMessageDefaults = function(o) {
  loggerMessageObj = o;
};
// this is what overrides the console object
const consoleOverride = function() {
  const msg = Array.prototype.slice.call(arguments);
  try {
    throw new Error();
  } catch (error) {
    let stackTrace;
    if (process.env.ENABLE_STACKTRACE) {
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
  if (process.env.ENABLE_CONSOLE_OVERIDE === 'true') return resetToDefaultConsole();
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
exports.setCloudWatchMessageDefaults = setCloudWatchMessageDefaults;
exports.getLogLevel = getLogLevel;
exports.overrideConsole = overrideConsole;
exports.consoleOverride = consoleOverride;
exports.resetToDefaultConsole = resetToDefaultConsole;
