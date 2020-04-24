module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json'],
    },
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
    ],
    rules: {
        "@typescript-eslint/camelcase": "warn",
        "@typescript-eslint/no-unnecessary-type-assertion": "off",
        "indent": ["error", "tab", { "SwitchCase": 1 }],
        "no-prototype-builtins": "off",
        "no-console": "off",
    }
};
