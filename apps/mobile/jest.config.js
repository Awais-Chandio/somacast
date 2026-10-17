const path = require('path');

module.exports = {
  preset: '@react-native/jest-preset',
  // @somacast/core lives outside this app; Babel helpers it needs are found here.
  moduleDirectories: ['node_modules', path.resolve(__dirname, 'node_modules')],
  // Tests never see the real .env: no Supabase URL means the app runs offline (demo ground only).
  moduleNameMapper: {
    '^@env$': '<rootDir>/__mocks__/env.ts',
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/node_modules/@react-native-async-storage/async-storage/lib/module/jest/AsyncStorageMock.js',
  },
  // Icon libraries ship untranspiled ESM (.mjs / .ts), so Babel must transform them too.
  transform: { '^.+\\.mjs$': 'babel-jest' },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage|react-native-url-polyfill|react-native-svg|lucide-react-native)/)',
  ],
};
