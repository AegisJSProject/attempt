import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default [{
	input: 'index.js',
	plugins: [nodeResolve()],
	output: [{
		file: 'index.cjs',
		format: 'cjs',
	}, {
		file: 'index.min.js',
		format: 'iife',
		plugins: [terser()],
		sourcemap: true,
	}, {
		file: 'index.mjs',
		format: 'module',
	}],
}, {
	input: 'consts.js',
	output: {
		file: 'consts.cjs',
		format: 'cjs',
	}
}];
