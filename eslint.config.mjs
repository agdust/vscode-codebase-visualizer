import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.strict,
	{
		ignores: ['media/**', 'dist/**', 'out/**', 'node_modules/**', 'test/sample-codebases/'],
	},
	{
		languageOptions: {
			globals: {
				...globals.node,
				...globals.es2021,
			},
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
		rules: {
			semi: ['error', 'always'],
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					"args": "all",
					"argsIgnorePattern": "^_",
					"caughtErrors": "all",
					"caughtErrorsIgnorePattern": "^_",
					"destructuredArrayIgnorePattern": "^_",
					"varsIgnorePattern": "^_",
					"ignoreRestSiblings": true
				}
			],
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/explicit-module-boundary-types': 'warn',
			'@typescript-eslint/no-non-null-assertion': 'error',
			'arrow-body-style': ["error", 'as-needed']
		},
	}
);
