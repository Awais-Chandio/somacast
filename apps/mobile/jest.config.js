const path = require('path');

module.exports = {
  preset: '@react-native/jest-preset',
  // @somacast/core lives outside this app; Babel helpers it needs are found here.
  moduleDirectories: ['node_modules', path.resolve(__dirname, 'node_modules')],
};
