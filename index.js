'use strict';
const got = require('got');

const create = () => got.create({
	options: got.mergeOptions(got.defaults.options, {
		json: true,
		token: process.env.GITLAB_TOKEN,
		baseUrl: process.env.GITLAB_ENDPOINT || 'https://gitlab.com/api/v4',
		headers: {
			'user-agent': 'https://github.com/singapore/gl-got'
		}
	}),
	methods: got.defaults.methods,
	handler: (options, next) => {
		if (options.token) {
			options.headers['PRIVATE-TOKEN'] = `${options.token}`;
		}

		if (options.stream) {
			return next(options);
		}

		return next(options).catch(err => {
			if (err.response && err.response.body) {
				err.name = 'GitLabError';
				err.message = `${err.response.body.message || err.response.body} (${err.statusCode})`;
			}

			throw err;
		});
	}
});

module.exports = create();

if (process.env.GL_GOT_TEST) {
	module.exports.recreate = create;
}
