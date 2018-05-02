# Cloudwatch Console Logger

[![Build Status](https://travis-ci.org/garrettmac/cloudwatch-console-logger.svg?branch=master)](https://travis-ci.org/garrettmac/cloudwatch-console-logger)
[![Coverage Status](https://coveralls.io/repos/github/garrettmac/cloudwatch-console-logger/badge.svg?branch=master)](https://coveralls.io/github/garrettmac/cloudwatch-console-logger?branch=master)



## Getting started

This creates a global `logger` variable with the option to overide the `console` in an aws enviornment to print objects rather than strings.

This is useful when using loggly.com

```
yarn add cloudwatch-console-logger

```

## Example Usage


```jsx
import CloudwatchConsoleLogger from 'cloudwatch-console-logger'
// initialize what you want to be added to each console.* or logger.* statment
 CloudwatchConsoleLogger.init({
    awsLambdaFunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
    awsRegion: process.env.AWS_REGION,
    timeZone: process.env.TZ,
    enviornment: process.env.STAGE,
    prNumber: process.env.PR || 'UNDEF',
    cookies: event.headers.Cookie,
    headers: event.headers,
    hostName: event.headers.Host
  });



  logger.info(`Hello world`);
  
  /* 
prints on server side only
   {
       // initial data
    awsLambdaFunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
    awsRegion: process.env.AWS_REGION,
    timeZone: process.env.TZ,
    enviornment: process.env.STAGE,
    prNumber: process.env.PR || 'UNDEF',
    cookies: event.headers.Cookie,
    headers: event.headers,
    hostName: event.headers.Host,
    // more data
    message: "Hello world"
    // and more, like line number.
   }
```