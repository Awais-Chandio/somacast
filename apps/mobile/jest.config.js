const path = require('path');

module.exports = {
  preset: '@react-native/jest-preset',
  // @somacast/core lives outside this app; Babel helpers it needs are found here.
  moduleDirectories: ['node_modules', path.resolve(__dirname, 'node_modules')],
  // Icon libraries ship untranspiled ESM (.mjs / .ts), so Babel must transform them too.
  transform: { '^.+\\.mjs$': 'babel-jest' },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-svg|lucide-react-native)/)',
  ],
};
