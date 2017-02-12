import stream from 'stream';
import test from 'ava';
import nock from 'nock';
import getStream from 'get-stream';
import glGot from './';

test.before('disable network requests', () => {
	nock.disableNetConnect();
});

test.afterEach.always('nock mock cleanup', () => {
	nock.cleanAll();
});

test.serial('invalid path', async t => {
	await t.throws(glGot({}), 'Expected \'path\' to be a string, got object');
});

test.serial('default', async t => {
	const scope = nock('https://gitlab.com', {reqheaders: {'user-agent': 'https://github.com/singapore/gl-got'}})
		.get('/api/v3/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	t.is((await glGot('users/979254')).body.username, 'gl-got-tester');

	scope.done();
});

test.serial('default get', async t => {
	const scope = nock('https://gitlab.com')
		.get('/api/v3/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	t.is((await glGot.get('users/979254')).body.username, 'gl-got-tester');

	scope.done();
});

test.serial('full path', async t => {
	const scope = nock('https://www.gitlab.com')
		.get('/api/v3/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	t.is((await glGot('https://www.gitlab.com/api/v3/users/979254')).body.username, 'gl-got-tester');

	scope.done();
});

test.serial('replace user-agent header', async t => {
	const scope = nock('https://gitlab.com', {reqheaders: {'user-agent': 'my-agent'}})
		.get('/api/v3/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	t.is((await glGot('users/979254', {headers: {'user-agent': 'my-agent'}})).body.username, 'gl-got-tester');

	scope.done();
});

test.serial('accepts options', async t => {
	const scope = nock('https://gitlab.com')
		.get('/api/v3/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	t.is((await glGot('users/979254', {})).body.username, 'gl-got-tester');

	scope.done();
});

test.serial('endpoint option', async t => {
	const scope = nock('https://gitlab.example.com')
		.get('/api/v3/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	t.is((await glGot('users/979254', {endpoint: 'https://gitlab.example.com/api/v3/'})).body.username, 'gl-got-tester');

	scope.done();
});

test.serial('endpoint environment variable', async t => {
	const scope = nock('https://gitlab.example.com')
		.get('/api/v3/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	process.env.GITLAB_ENDPOINT = 'https://gitlab.example.com/api/v3/';
	t.is((await glGot('users/979254')).body.username, 'gl-got-tester');
	delete process.env.GITLAB_ENDPOINT;

	scope.done();
});

test.serial('endpoint option over endpoint environment variable', async t => {
	const scope = nock('https://gitlab.example.org')
		.get('/api/v3/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	process.env.GITLAB_ENDPOINT = 'https://gitlab.example.com/api/v3/';
	t.is((await glGot('users/979254', {endpoint: 'https://gitlab.example.org/api/v3/'})).body.username, 'gl-got-tester');
	delete process.env.GITLAB_ENDPOINT;

	scope.done();
});

test.serial('token option', async t => {
	const scope = nock('https://gitlab.com', {reqheaders: {'PRIVATE-TOKEN': 'MYTOKEN'}})
		.get('/api/v3/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	t.is((await glGot('users/979254', {token: 'MYTOKEN'})).body.username, 'gl-got-tester');

	scope.done();
});

test.serial('token environment variable', async t => {
	const scope = nock('https://gitlab.com', {reqheaders: {'PRIVATE-TOKEN': 'MYTOKEN'}})
		.get('/api/v3/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	process.env.GITLAB_TOKEN = 'MYTOKEN';
	t.is((await glGot('users/979254')).body.username, 'gl-got-tester');
	delete process.env.GITLAB_TOKEN;

	scope.done();
});

test.serial('token option over token environment variable', async t => {
	const scope = nock('https://gitlab.com', {reqheaders: {'PRIVATE-TOKEN': 'MYOTHERTOKEN'}})
		.get('/api/v3/users/979254')
		.reply(200, {username: 'gl-got-tester'});

	process.env.GITLAB_TOKEN = 'MYTOKEN';
	t.is((await glGot('users/979254', {token: 'MYOTHERTOKEN'})).body.username, 'gl-got-tester');
	delete process.env.GITLAB_TOKEN;

	scope.done();
});

test.serial('bad token', async t => {
	const scope = nock('https://gitlab.com', {reqheaders: {'PRIVATE-TOKEN': 'fail'}})
	.get('/api/v3/users/979254')
	.reply(401, {message: '401 Unauthorized'});

	await t.throws(glGot('users/979254', {token: 'fail'}), 'Response code 401 (Unauthorized)');

	scope.done();
});

test.serial('stream interface', async t => {
	const scope = nock('https://gitlab.com')
		.get('/api/v3/users/979254')
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

test.serial('json body', async t => {
	const body = {test: [1, 3, 3, 7]};
	const reply = {ok: true};
	const scope = nock('https://gitlab.com')
		.post('/api/v3/users', body)
		.reply(200, reply);

	t.deepEqual((await glGot('users', {endpoint: 'https://gitlab.com/api/v3/', body})).body, reply);

	scope.done();
});
