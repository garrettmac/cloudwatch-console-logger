// https://wallabyjs.com/
module.exports = function(wallaby) {
  return {
    files: [
      'src/**/*.js'
    ],
    tests: [
      'src/**/*.test.js'
    ],
    env: {
      type: 'node',
      runner: 'node',
      kind: 'chrome'
    },
    compilers: {
      '**/*.js': wallaby.compilers.babel()
    },
    setup(wallaby) {
      let jestConfig = require('./package.json').jest;
      jestConfig = JSON.parse(JSON.stringify(jestConfig).replace(/\<rootDir\>/g, '.')); // bug in new wallaby update where rootDir is not regonized
      wallaby.testFramework.configure(jestConfig);
    },
    testFramework: 'jest'
  };
};
