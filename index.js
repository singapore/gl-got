'use strict';
const got = require('got');
const isPlainObj = require('is-plain-obj');

function glGot(path, opts) {
	if (typeof path !== 'string') {
		return Promise.reject(new TypeError(`Expected 'path' to be a string, got ${typeof path}`));
	}

	const env = process.env;

	opts = Object.assign({
		json: true,
		token: env.GITLAB_TOKEN,
		endpoint: env.GITLAB_ENDPOINT ? env.GITLAB_ENDPOINT.replace(/[^/]$/, '$&/') : 'https://gitlab.com/api/v3/'
	}, opts);

	opts.headers = Object.assign({
		'user-agent': 'https://github.com/singapore/gl-got'
	}, opts.headers);

	if (opts.token) {
		opts.headers['PRIVATE-TOKEN'] = opts.token;
	}

	// TODO: remove this when Got eventually supports it
	// https://github.com/sindresorhus/got/issues/174
	if (isPlainObj(opts.body)) {
		opts.headers['content-type'] = 'application/json';
		opts.body = JSON.stringify(opts.body);
	}

	const url = /^https?/.test(path) ? path : opts.endpoint + path;

	if (opts.stream) {
		return got.stream(url, opts);
	}

	return got(url, opts);
}

const helpers = [
	'get',
	'post',
	'put',
	'patch',
	'head',
	'delete'
];

glGot.stream = (url, opts) => glGot(url, Object.assign({}, opts, {
	json: false,
	stream: true
}));

for (const x of helpers) {
	const method = x.toUpperCase();
	glGot[x] = (url, opts) => glGot(url, Object.assign({}, opts, {method}));
	glGot.stream[x] = (url, opts) => glGot.stream(url, Object.assign({}, opts, {method}));
}

module.exports = glGot;
