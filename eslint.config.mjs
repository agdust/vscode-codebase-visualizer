import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default defineConfig(
	eslint.configs.recommended,
	tseslint.configs.strictTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ['eslint.config.mjs'],
				},
			},
		},
	},
	globalIgnores(['media/**', 'dist/**', 'out/**', 'node_modules/**', 'test/sample-repos/', '.vscode-test', '.vscode']),
	{
		files: ['**/*.ts', '**/*.js'],
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
			'@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off', // forces to use type-casting methods
			'@typescript-eslint/no-unnecessary-condition': 'off', // forces to delete last `if` statement
			'@typescript-eslint/explicit-module-boundary-types': 'warn',
			'@typescript-eslint/no-non-null-assertion': 'error',
			'arrow-body-style': ["error", 'always'],
			'eqeqeq': 'error'
		},
	}
);
