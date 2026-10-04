import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAuth, authHelp } from '../src/auth.js';

// ---- resolveAuth: bearer tokens, apiKey, headers, env vars, zcode ----------------

test('resolveAuth: explicit headers passed through', () => {
  const headers = resolveAuth({ headers: { 'X-Custom': 'value', 'Authorization': 'Bearer abc' } });
  assert.equal(headers['X-Custom'], 'value');
  assert.equal(headers.Authorization, 'Bearer abc');
});

test('resolveAuth: bearer type with literal token', () => {
  const headers = resolveAuth({ auth: { type: 'bearer', token: 'my-token-123' } });
  assert.equal(headers.Authorization, 'Bearer my-token-123');
});

test('resolveAuth: bearer type with env var interpolation', () => {
  process.env.TEST_AUTH_TOKEN = 'env-resolved-token';
  try {
    const headers = resolveAuth({ auth: { type: 'bearer', token: '${TEST_AUTH_TOKEN}' } });
    assert.equal(headers.Authorization, 'Bearer env-resolved-token');
  } finally { delete process.env.TEST_AUTH_TOKEN; }
});

test('resolveAuth: apiKey type with custom header', () => {
  const headers = resolveAuth({ auth: { type: 'apiKey', header: 'X-API-Key', value: 'key123' } });
  assert.equal(headers['X-API-Key'], 'key123');
  assert.equal(headers.Authorization, undefined);
});

test('resolveAuth: explicit headers override auth config', () => {
  const headers = resolveAuth({
    headers: { Authorization: 'Bearer explicit' },
    auth: { type: 'bearer', token: 'from-auth' },
  });
  assert.equal(headers.Authorization, 'Bearer explicit', 'headers win');
});

test('resolveAuth: zcode_official reads env var token', () => {
  process.env.ZCODE_JWT_TOKEN = 'zcode-test-jwt';
  try {
    const headers = resolveAuth({ auth: { type: 'zcode_official', provider: 'jwt_token' } });
    assert.equal(headers.Authorization, 'Bearer zcode-test-jwt');
  } finally { delete process.env.ZCODE_JWT_TOKEN; }
});

test('resolveAuth: no auth config = empty headers', () => {
  const headers = resolveAuth({ url: 'https://example.com' });
  assert.equal(Object.keys(headers).length, 0);
});

test('resolveAuth: env var in headers object', () => {
  process.env.MY_SECRET = 'secret-value';
  try {
    const headers = resolveAuth({ headers: { Authorization: 'Bearer ${MY_SECRET}' } });
    assert.equal(headers.Authorization, 'Bearer secret-value');
  } finally { delete process.env.MY_SECRET; }
});

// ---- authHelp -----------------------------------------------------------------

test('authHelp: zcode gives actionable steps', () => {
  const help = authHelp({ auth: { type: 'zcode_official' } });
  assert.match(help, /ZCODE_JWT_TOKEN/);
  assert.match(help, /headers.*Authorization/);
});

test('authHelp: bearer suggests token config', () => {
  const help = authHelp({ auth: { type: 'bearer' } });
  assert.match(help, /token.*value|ENV_VAR/);
});
