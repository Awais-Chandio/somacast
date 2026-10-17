module.exports = api => {
  const isTest = api.env('test');
  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      // zod v4 (used by @somacast/core) has `export * as ns from`, which the RN preset does not transform.
      '@babel/plugin-transform-export-namespace-from',
      // `import { SUPABASE_URL } from '@env'` is replaced with the value from apps/mobile/.env at build time.
      // Only imported names reach the bundle. Tests never read .env: jest maps '@env' to a stub.
      // After editing .env, restart Metro with `npm start -- --reset-cache`.
      ...(isTest
        ? []
        : [
            [
              'module:react-native-dotenv',
              {
                moduleName: '@env',
                path: '.env',
                safe: false,
                allowUndefined: true,
              },
            ],
          ]),
    ],
  };
};
