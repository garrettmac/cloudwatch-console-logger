import Logger from './index';
import intercept from 'intercept-stdout';
const MOCK_ENV = {
  AWS_EXECUTION_ENV: 'AWS_Lambda_nodejs',
  AWS_LAMBDA_FUNCTION_NAME: 'myLambdaFunction',
  AWS_REGION: 'usa',
  LOG_LEVEL: '0',
  ENABLE_CONSOLE_OVERIDE: true,
  ENABLE_STACKTRACE: false,
  STAGE: '',
  TZ: 'pacific'
};
const loggerItems = [
  { method: 'log', logLevel: '20' },
  { method: 'info', logLevel: '20' },
  { method: 'warn', logLevel: '30' },
  { method: 'error', logLevel: '40' }
];
const loggerFunctions = [ 'setCloudWatchMessageDefaults', 'getLogLevel', 'overrideConsole', 'consoleOverride', 'resetToDefaultConsole' ];
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
  let hookedIntercept;
  let unhook_intercept;
  const REAL_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    logs = [];
    process.env = { ...MOCK_ENV };
    delete process.env.NODE_ENV;
    defaultMessage = {
      awsLambdaFunctionName: 'myLambdaFunction',
      awsRegion: 'usa',
      executionEnv: 'AWS_Lambda_nodejs',
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
      message: "Lambda function 'myLambdaFunction' default log level is set to NOTSET",
      'pr-number': process.env.PR || process.env.PR_NUMBER || 'UNDEF',
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
        }).filter(o => o)
      ;
    };
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
      Logger.setCloudWatchMessageDefaults(defaultMessage);
      logger.info(`Lambda function '${ process.env.AWS_LAMBDA_FUNCTION_NAME }' default log level is set to NOTSET`);
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
      logger.log('this is a log');
      unhook_intercept();
      const [ log ] = logs;
      expect(logger.log).toBeCalledWith('this is a log');
      expect(logs.length).toBe(1);
      expect(log.logLevel).toBe('INFO');
    });
  });
  describe('other helper methods ', () => {
    beforeEach(() => {
      jest.resetModules();
      process.env = { ...MOCK_ENV };
      delete process.env.NODE_ENV;
    });
    afterEach(() => {
      unhook_intercept();
      logs = [];
      process.env = REAL_ENV;
    });
    loggerFunctions.forEach(fn => {
      it(`"Logger.${fn}" should be defined`,()=>{
        expect(Logger[fn]).toBeDefined();
      });
    });
    it('should not return "pr-number" if "process.env.PR" is not defined',()=>{
      jest.resetModules();
      jest.spyOn(Logger, 'setCloudWatchMessageDefaults');
      // process.env = MOCK_ENV;
      Logger.setCloudWatchMessageDefaults(defaultMessage);
      logger.info(`Lambda function '${ process.env.AWS_LAMBDA_FUNCTION_NAME }' default log level is set to NOTSET`);
      unhook_intercept();
      expect(process.env.PR).toBeUndefined();
      const [ initialMessage ] = logs;
      expect(initialMessage['pr-number']).toMatch('UNDEF');
    });
    it('should return "pr-number" if "process.env.PR" is defined',()=>{
      process.env.PR = '123';
      Logger.setCloudWatchMessageDefaults({ defaultMessage,...{ 'pr-number' :'123' } });
      logger.info(`Lambda function '${ process.env.AWS_LAMBDA_FUNCTION_NAME }' default log level is set to NOTSET`);
      unhook_intercept();
      const [ initialMessage ] = logs;
      expect(process.env).toMatchObject(MOCK_ENV);
      expect(initialMessage['pr-number']).toBe('123');
    });
    it('should call "getLogLevel()"',()=>{
      delete process.env.LOG_LEVEL;
      jest.spyOn(Logger, 'setCloudWatchMessageDefaults');
      Logger.setCloudWatchMessageDefaults(defaultMessage);
      logger.info(`Lambda function '${ process.env.AWS_LAMBDA_FUNCTION_NAME }' default log level is set to NOTSET`);
      unhook_intercept();
      const [ initialMessage ] = logs;
      expect(initialMessage.logLevel).toMatch('INFO');
    });
    it('should get component name',()=>{
      jest.spyOn(logger, 'log');
      logger.log('[some/path] some message');
      unhook_intercept();
      const [ message ] = logs;
      expect(message.componentName).toMatch('some/path');
    });
    it('should get string when "ENABLE_CONSOLE_OVERIDE" is true',()=>{
      jest.resetModules();
      jest.spyOn(console, 'log');
      jest.spyOn(Logger, 'overrideConsole');
      process.env = { ...MOCK_ENV, ...{ ENABLE_CONSOLE_OVERIDE:'true' } };
      Logger.overrideConsole();
      console.log('[some/path] some message');
      unhook_intercept();
      const [ blub, message ] = logs; //  eslint-disable-line no-unused-vars
      expect(message).toContain('[some/path] some message');
    });
    it('should start with bracket to get name if log " [some/path] some message"',()=>{
      jest.spyOn(logger, 'log');
      logger.log(' [some/path] some message');
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
      process.env = { ...MOCK_ENV,ENABLE_CONSOLE_OVERIDE:'true' } ;
      const overrideConsole = jest.spyOn(Logger, 'overrideConsole');
      expect(overrideConsole).toHaveBeenCalled();
    });
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
