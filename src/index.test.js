import Logger from './index';
import intercept from 'intercept-stdout';
const event = {
  httpMethod: 'GET',
  path: '/',
  resource: '/{proxy+}',
  queryStringParameters: null,
  headers: {
    Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'CloudFront-Forwarded-Proto': 'https',
    'CloudFront-Is-Desktop-Viewer': 'true',
    'CloudFront-Is-Mobile-Viewer': 'false',
    'CloudFront-Is-SmartTV-Viewer': 'false',
    'CloudFront-Is-Tablet-Viewer': 'false',
    'CloudFront-Viewer-Country': 'CA',
    dnt: '1',
    Host: 'example.com',
    Referer: 'https://example.com/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.162 Safari/537.36',
    'X-Forwarded-Port': '111',
    'X-Forwarded-Proto': 'http'
  }
};
const context = {
  callbackWaitsForEmptyEventLoop: true,
  logGroupName: 'someGroup',
  logStreamName: '2018/03/20/[$LATEST]XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  functionName: 'myLambdaFunction',
  memoryLimitInMB: '256',
  functionVersion: '$LATEST',
  invokeid: 'XXXXX-XXXX-XXXX-XXXXX-XXXXXXXXXX',
  awsRequestId: 'a17a32b2-XXXX-XXXX-XXXXX-XXXXXXXXXX',
  invokedFunctionArn: 'arn:aws:lambda:us-west-2:XXXXX:function:myLambdaFunction'
};
const MOCK_ENV = {
  _X_AMZN_TRACE_ID: 'XXXXXXXXXXXXXXXXXXXXX',
  ACCESS_CONTROL_ON: 'false',
  AWS_EXECUTION_ENV: 'AWS_Lambda_nodejs6.10',
  AWS_LAMBDA_FUNCTION_NAME: 'myLambdaFunction',
  AWS_REGION: 'west-2',
  AWS_XRAY_CONTEXT_MISSING: 'LOG_ERROR',
  LOG_LEVEL: '0',
  ENABLE_CONSOLE_OVERIDE: true,
  ENABLE_STACKTRACE: false,
  PR_NUMBER: '12345', //can set enviorment variable
  STAGE: '',
  TZ: 'pacific'
};
const loggerItems = [
  { method: 'log', logLevel: '20' },
  { method: 'info', logLevel: '20' },
  { method: 'warn', logLevel: '30' },
  { method: 'error', logLevel: '40' }
];
const loggerFunctions = [ 'init', 'initCloudwatchConsole', 'getLogLevel', 'overrideConsole', 'consoleOverride', 'resetToDefaultConsole' ];
// extend jests "expect" for custom checkers
expect.extend({
  toHaveLogLevel(log, argument) {
    const pass = log.logLevel === argument;
    const passed = ({
      pass: true,
      message: () => `expected  "logger.${log.logMethod}" not to set log level to "${log.logLevel}"`
    });
    const failed = ({
      pass: false,
      message: () => `expected "logger.${log.logMethod}" to set log level to "${log.logLevel}" but got ${argument}. This is the log that was passed: ${log}`
    });
    return pass ? passed : failed;
  },
  toLogMessage(log, argument) {
    const pass = log.message === argument;
    const passed = ({
      pass: true,
      message: () => `expected "logger.${log.logMethod}" to output message "${log.message}"`
    });
    const failed = ({
      pass: false,
      message: () => `expected "logger.${log.logMethod}" to output message "${log.message}" but got "${argument}". This is the log that was passed: ${log}`
    });
    return pass ? passed : failed;
  }
});
describe('Cloudwatch Console Logger', () => {
  let logs;
  let defaultMessage;
  let hookedIntercept; // when you call this it enables the output from logs
  let unhook_intercept; // when you call this it enables the output from logs
  const REAL_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    logs = [];
    defaultMessage = {
      awsLambdaFunctionName: 'myLambdaFunction',
      awsRegion: 'west-2',
      executionEnv: 'AWS_Lambda_nodejs6.10',
      headers: {
        Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'CloudFront-Forwarded-Proto': 'https',
        'CloudFront-Is-Desktop-Viewer': 'true',
        'CloudFront-Is-Mobile-Viewer': 'false',
        'CloudFront-Is-SmartTV-Viewer': 'false',
        'CloudFront-Is-Tablet-Viewer': 'false',
        'CloudFront-Viewer-Country': 'CA',
        Host: 'example.com',
        Referer: 'https://example.com/',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.162 Safari/537.36'
      },
      hostName: 'example.com',
      logLevel: 'INFO',
      message: "Lambda function'myLambdaFunction' default log level is set to NOTSET",
      prNumber: '12345',
      timeZone: 'pacific'
    };
    //this silences logs from being displayed
    hookedIntercept = intercept(text => {
      logs.push(text);
      return '';
    });
    unhook_intercept = () => {
      hookedIntercept();
      // Can do more here, but this parses out the messages
      logs = logs
        .filter(o => o)
        .map(o => {
          try {
            o = JSON.parse(o);
          } catch (error) {}
          return o;
        })
      ;
    };
    process.env = { ...MOCK_ENV };
    delete process.env.NODE_ENV;
  });
  afterEach(() => {
    unhook_intercept();
    logs = [];
    process.env = REAL_ENV;
  });
  describe('each method should recive output the correct infomation ', () => {
    it('expect MOCK_ENV process to be set', () => {
      expect(process.env).toMatchObject(MOCK_ENV);
    });
    it('it should contain the "initiated Lambda Logger" message', () => {
      Logger.initCloudwatchConsole(event, context);
      unhook_intercept();
      const [ initialMessage ] = logs;
      expect(initialMessage).toMatchObject(defaultMessage);
    });
    it('should have log method "log" defined in global scope', () => {
      jest.spyOn(logger, 'log');
      expect(logger.log).toBeDefined();
      unhook_intercept();
    });
    it('should have log method "log" defined in global scope', () => {
      jest.spyOn(logger, 'log');
      logger.log('hackerman logie boi');
      unhook_intercept();
      const [ log ] = logs;
      expect(logger.log).toBeCalledWith('hackerman logie boi');
      expect(logs.length).toBe(1);
      expect(log.logLevel).toBe('INFO');
    });
  });
  describe('other helper methods ', () => {
    beforeEach(() => {
      jest.resetModules();
      process.env = { ...MOCK_ENV };
    });
    loggerFunctions.forEach(fn => {
      it(`"Logger.${fn}" should be defined`,()=>{
        expect(Logger[fn]).toBeDefined();
      });
    });
    it('should not return "prNumber" if "process.env.PR_NUMBER" is not defined',()=>{
      delete process.env.PR_NUMBER;
      Logger.initCloudwatchConsole(event, context);
      unhook_intercept();
      const [ initialMessage ] = logs;
      expect(initialMessage.prNumber).toMatch('UNDEF');
    });
    it('should return "prNumber" if "process.env.PR_NUMBER" is defined',()=>{
      process.env.PR_NUMBER = '123';
      Logger.initCloudwatchConsole(event, context);
      unhook_intercept();
      const [ initialMessage ] = logs;
      expect(initialMessage.prNumber).toMatch('123');
    });
    it('should call "getLogLevel()"',()=>{
      delete process.env.LOG_LEVEL;
      jest.spyOn(Logger, 'initCloudwatchConsole');
      Logger.initCloudwatchConsole(event, context);
      unhook_intercept();
      const [ initialMessage ] = logs;
      expect(initialMessage.logLevel).toMatch('INFO');
    });
    it('should get component name',()=>{
      jest.spyOn(logger, 'log');
      logger.log('[src/home] fo bar');
      unhook_intercept();
      const [ message ] = logs;
      expect(message.componentName).toMatch('src/home');
    });
    it('should start with bracket to get name if log " [src/home] fo bar"',()=>{
      jest.spyOn(logger, 'log');
      logger.log(' [src/home] fo bar');
      unhook_intercept();
      const [ message ] = logs;
      expect(message.componentName).toBeUndefined();
    });
    it('should not get component name if log "foo bar baz"',()=>{
      jest.spyOn(logger, 'log');
      logger.log('foo bar baz');
      unhook_intercept();
      const [ message ] = logs;
      expect(message.componentName).toBeUndefined();
    });
    it('should call "resetToDefaultConsole()" if process.env.ENABLE_CONSOLE_OVERIDE is set to false ',()=>{
      process.env = { ...MOCK_ENV,ENABLE_CONSOLE_OVERIDE:false } ;
      const overrideConsole = jest.spyOn(Logger, 'overrideConsole');
      expect(overrideConsole).not.toHaveBeenCalled();
    });
    // it('should use default console if "process.env.DISABLE_CONSOLE_OVERIDE" is defined',()=>{
    //   let BASE_DISABLE_CONSOLE_OVERIDE = process.env.DISABLE_CONSOLE_OVERIDE
    //   jest.spyOn(Logger, "initCloudwatchConsole");
    //   const resetToDefaultConsole = jest.spyOn(Logger, "resetToDefaultConsole");
    //   process.env.DISABLE_CONSOLE_OVERIDE = true
    //   Logger.initCloudwatchConsole(event, context);
    //   unhook_intercept();
    //   expect(Logger.resetToDefaultConsole).toHaveBeenCalled();
    //   const [ initialMessage ] = logs;
    //   expect(process.env.DISABLE_CONSOLE_OVERIDE).toBe(true);
    //   process.env.DISABLE_CONSOLE_OVERIDE =BASE_DISABLE_CONSOLE_OVERIDE
    // });
    it('"resetToDefaultConsole()" => should reset console.log to global.console.log if called',()=>{
      Logger.resetToDefaultConsole();
      expect(console.log).toBe(global.console.log);
    });
  });
  describe('each method should have received and set the correct information ', () => {
    // call each of method
    it('each method should set the correct log level', () => {
      loggerItems.forEach(({ method }) => {
        jest.spyOn(logger, `${method}`);
        logger[method](`hello ${method} boi`);
      });
      unhook_intercept();
      const [ logLog, infoLog, warnLog, errorLog ] = logs;
      expect(logs.length).toBe(4);
      expect(logLog).toHaveLogLevel('INFO');
      expect(infoLog).toHaveLogLevel('INFO');
      expect(warnLog).toHaveLogLevel('WARNING');
      expect(errorLog).toHaveLogLevel('ERROR');
    });
    it('each method should set the correct message', () => {
      loggerItems.forEach(({ method }) => {
        jest.spyOn(logger, `${method}`);
        logger[method](`hello Mr. '${method}'`);
      });
      unhook_intercept();
      const [ logLog, infoLog, warnLog, errorLog ] = logs;
      expect(logLog).toLogMessage("hello Mr. 'log'");
      expect(infoLog).toLogMessage("hello Mr. 'info'");
      expect(warnLog).toLogMessage("hello Mr. 'warn'");
      expect(errorLog).toLogMessage("hello Mr. 'error'");
    });
  });
});
