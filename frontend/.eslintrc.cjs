module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react/jsx-no-target-blank': 'off',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // ปิดกฎ prop-types หากไม่ได้ใช้งาน หรือใช้ TypeScript ในอนาคต
    'react/prop-types': 'off',
    // แจ้งเตือนตัวแปรที่ไม่ได้ใช้งาน แต่ยกเว้นตัวแปรที่ขึ้นต้นด้วย _
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};
