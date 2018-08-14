'use strict';
const got = require('got');
const isPlainObj = require('is-plain-obj');

const create = () => got.create({
	options: got.mergeOptions(got.defaults.options, {
		json: true,
		token: process.env.GITLAB_TOKEN,
		baseUrl: process.env.GITLAB_ENDPOINT ? process.env.GITLAB_ENDPOINT.replace(/[^/]$/, '$&/') : 'https://gitlab.com/api/v4/',
		headers: {
			'user-agent': 'https://github.com/singapore/gl-got'
		}
	}),
	methods: got.defaults.methods,
	handler: (options, next) => {
		if (options.token) {
			options.headers.authorization = `token ${options.token}`;
		}

		if (options.method && options.method === 'PUT' && !options.body) {
			options.headers['content-length'] = 0;
		}

		if (options.stream) {
			return next(options);
		}

		return next(options).catch(err => {
			if (err.response && isPlainObj(err.response.body)) {
				err.name = 'GitLabError';
				err.message = `${err.response.body.message} (${err.statusCode})`;
			}

			throw err;
		});
	}
});

module.exports = create();

if (process.env.NODE_ENV === 'test') {
	module.exports.recreate = create;
}
