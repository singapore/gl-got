import stream from 'stream';
import test from 'ava';
import nock from 'nock';
import getStream from 'get-stream';
import glGot from '.';

test.before('disable network requests', () => {
	nock.disableNetConnect();
});

test.afterEach.always('nock mock cleanup', () => {
	nock.cleanAll();
});

test.serial('invalid path', async t => {
	const err = await t.throwsAsync(glGot({}));
	t.is(err.message, 'Invalid URL: http:');
});

test.serial('default', async t => {
	const scope = nock('https://gitlab.com', {reqheaders: {'user-agent': 'https://github.com/singapore/gl-got'}})
		.get('/api/v4/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	t.is((await glGot('users/979254')).body.username, 'gl-got-tester');

	scope.done();
});

test.serial('default get', async t => {
	const scope = nock('https://gitlab.com')
		.get('/api/v4/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	t.is((await glGot.get('users/979254')).body.username, 'gl-got-tester');

	scope.done();
});

test.serial('full path', async t => {
	const scope = nock('https://www.gitlab.com')
		.get('/api/v4/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	t.is((await glGot('https://www.gitlab.com/api/v4/users/979254')).body.username, 'gl-got-tester');

	scope.done();
});

test.serial('replace user-agent header', async t => {
	const scope = nock('https://gitlab.com', {reqheaders: {'user-agent': 'my-agent'}})
		.get('/api/v4/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	t.is((await glGot('users/979254', {headers: {'user-agent': 'my-agent'}})).body.username, 'gl-got-tester');

	scope.done();
});

test.serial('accepts options', async t => {
	const scope = nock('https://gitlab.com')
		.get('/api/v4/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	t.is((await glGot('users/979254', {})).body.username, 'gl-got-tester');

	scope.done();
});

test.serial('baseUrl option', async t => {
	const scope = nock('https://gitlab.example.com')
		.get('/api/v4/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	t.is((await glGot('users/979254', {baseUrl: 'https://gitlab.example.com/api/v4/'})).body.username, 'gl-got-tester');

	scope.done();
});

test.serial('endpoint environment variable', async t => {
	const scope = nock('https://gitlab.example.com')
		.get('/api/v4/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	process.env.GITLAB_ENDPOINT = 'https://gitlab.example.com/api/v4/';
	t.is((await glGot.recreate()('users/979254')).body.username, 'gl-got-tester');
	delete process.env.GITLAB_ENDPOINT;

	scope.done();
});

test.serial('baseUrl option over endpoint environment variable', async t => {
	const scope = nock('https://gitlab.example.org')
		.get('/api/v4/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	process.env.GITLAB_ENDPOINT = 'https://gitlab.example.com/api/v4/';
	t.is((await glGot.recreate()('users/979254', {baseUrl: 'https://gitlab.example.org/api/v4/'})).body.username, 'gl-got-tester');
	delete process.env.GITLAB_ENDPOINT;

	scope.done();
});

test.serial('token option', async t => {
	const scope = nock('https://gitlab.com', {reqheaders: {authorization: 'token MYTOKEN'}})
		.get('/api/v4/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	t.is((await glGot('users/979254', {token: 'MYTOKEN'})).body.username, 'gl-got-tester');

	scope.done();
});

test.serial('token environment variable', async t => {
	const scope = nock('https://gitlab.com', {reqheaders: {authorization: 'token MYTOKEN'}})
		.get('/api/v4/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	process.env.GITLAB_TOKEN = 'MYTOKEN';
	t.is((await glGot.recreate()('users/979254')).body.username, 'gl-got-tester');
	delete process.env.GITLAB_TOKEN;

	scope.done();
});

test.serial('token option over token environment variable', async t => {
	const scope = nock('https://gitlab.com', {reqheaders: {authorization: 'token MYOTHERTOKEN'}})
		.get('/api/v4/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	process.env.GITLAB_TOKEN = 'MYTOKEN';
	t.is((await glGot.recreate()('users/979254', {token: 'MYOTHERTOKEN'})).body.username, 'gl-got-tester');
	delete process.env.GITLAB_TOKEN;

	scope.done();
});

test.serial('bad token', async t => {
	const scope = nock('https://gitlab.com', {reqheaders: {authorization: 'token fail'}})
		.get('/api/v4/users/979254')
		.reply(401, {message: 'Bad credentials'});

	const err = await t.throwsAsync(glGot('users/979254', {token: 'fail'}));
	t.is(err.name, 'GitLabError');
	t.is(err.message, 'Bad credentials (401)');

	scope.done();
});

test.serial('bad token with string error response', async t => {
	const scope = nock('https://gitlab.com', {reqheaders: {authorization: 'token fail'}})
		.get('/api/v4/users/979254')
		// This is not an expected response, but it tests the error handling code in `gl-got`.
		.reply(401, ['Bad credentials']);

	const err = await t.throwsAsync(glGot('users/979254', {token: 'fail'}));
	t.is(err.message, 'Response code 401 (Unauthorized)');

	scope.done();
});

test.serial('stream interface', async t => {
	const scope = nock('https://gitlab.com')
		.get('/api/v4/users/979254')
		.reply(200, () => {
			const readableStream = new stream.Readable();
			readableStream.push('{"username": "gl-got-tester"}');
			readableStream.push(null);
			return readableStream;
		})
		.persist();

	t.is(JSON.parse(await getStream(glGot('users/979254', {json: false, stream: true}))).username, 'gl-got-tester');
	t.is(JSON.parse(await getStream(glGot.stream('users/979254'))).username, 'gl-got-tester');
	t.is(JSON.parse(await getStream(glGot.stream.get('users/979254'))).username, 'gl-got-tester');

	scope.done();
});
