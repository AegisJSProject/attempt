import terser from '@rollup/plugin-terser';

export default [{
	input: 'attempt.js',
	output: [{
		file: 'attempt.cjs',
		format: 'cjs',
	}, {
		file: 'attempt.min.js',
		format: 'esm',
		plugins: [terser()],
		sourcemap: true,
	}],
}];
