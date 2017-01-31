import test from 'ava';
import nock from 'nock';
import getStream from 'get-stream';
import m from './';

const token = process.env.GITLAB_TOKEN;

test('default', async t => {
	t.is((await m('users/979254')).body.username, 'gl-got-tester');
});

test('full path', async t => {
	t.is((await m('https://gitlab.com/api/v3/users/979254')).body.username, 'gl-got-tester');
});

test('accepts options', async t => {
	t.is((await m('users/979254', {})).body.username, 'gl-got-tester');
});

test.serial('global token option', async t => {
	process.env.GITLAB_TOKEN = 'fail';
	await t.throws(m('users/979254'), 'Response code 401 (Unauthorized)');
	process.env.GITLAB_TOKEN = token;
});

test('token option', t => {
	t.throws(m('users/979254', {token: 'fail'}), 'Response code 401 (Unauthorized)');
});

test.serial('global endpoint option', async t => {
	process.env.GITLAB_ENDPOINT = 'fail';
	await t.throws(m('users/979254', {retries: 1}), /ENOTFOUND/);
	delete process.env.GITLAB_ENDPOINT;
});

test.serial('endpoint option', async t => {
	process.env.GITLAB_ENDPOINT = 'https://api.github.com/';
	await t.throws(m('users/979254', {
		endpoint: 'fail',
		retries: 1
	}), /ENOTFOUND/);
	delete process.env.GITLAB_ENDPOINT;
});

test('stream interface', async t => {
	t.is(JSON.parse(await getStream(m.stream('users/979254'))).username, 'gl-got-tester');
	t.is(JSON.parse(await getStream(m.stream.get('users/979254'))).username, 'gl-got-tester');
});

test('json body', async t => {
	const endpoint = 'http://mock-endpoint';
	const body = {test: [1, 3, 3, 7]};
	const reply = {ok: true};

	const scope = nock(endpoint).post('/test', body).reply(200, reply);

	t.deepEqual((await m('/test', {endpoint, body})).body, reply);
	t.truthy(scope.isDone());
});
