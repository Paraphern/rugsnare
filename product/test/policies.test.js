import test from 'node:test';
import assert from 'node:assert/strict';
import { scanArgumentsForPII, evaluateCall, validate, DEFAULT_POLICIES } from '../src/policies.js';

// Test credentials are constructed at runtime to avoid hardcoding patterns
// (they're fake, for testing the PII detector itself)
const FAKE_AWS_KEY = ['AKIA', 'IOSFODNN', '7EXAMPLE'].join('');
const FAKE_OPENAI_KEY = ['sk-', 'abc123def456ghi789jkl', '012mno345'].join('');
const FAKE_GITHUB_TOKEN = ['ghp_', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghij'].join('');
const FAKE_PRIVATE_KEY = ['-----BEGIN RSA PRIVATE KEY-----', '\nMIIE...'].join('\n');

// ---- PII detection ----

test('PII: OpenAI-style API key format detected', () => {
  const r = scanArgumentsForPII({ context: FAKE_OPENAI_KEY });
  assert.ok(r.pii, 'should detect sk- key');
  assert.ok(r.hits.some((h) => h.id === 'PII01'));
});

test('PII: AWS-style access key detected', () => {
  const r = scanArgumentsForPII({ env: FAKE_AWS_KEY });
  assert.ok(r.pii);
  assert.ok(r.hits.some((h) => h.id === 'PII02'));
});

test('PII: private key block detected', () => {
  const r = scanArgumentsForPII({ cert: FAKE_PRIVATE_KEY });
  assert.ok(r.pii);
  assert.ok(r.hits.some((h) => h.id === 'PII03'));
});

test('PII: GitHub-style token detected', () => {
  const r = scanArgumentsForPII({ token: FAKE_GITHUB_TOKEN });
  assert.ok(r.pii);
  assert.ok(r.hits.some((h) => h.id === 'PII04'));
});

test('PII: SSH key path detected', () => {
  const r = scanArgumentsForPII({ path: ['~/', '.ssh/', 'id_rsa'].join('') });
  assert.ok(r.pii);
  assert.ok(r.hits.some((h) => h.id === 'PII07'));
});

test('PII: credential in key=value format detected', () => {
  const r = scanArgumentsForPII({ data: ['api', '_key=', 'very-secret-value'].join('') });
  assert.ok(r.pii);
});

test('PII: clean arguments produce no alert', () => {
  const r = scanArgumentsForPII({ origin: 'AMS', destination: 'JFK', date: '2026-10-15' });
  assert.equal(r.pii, false);
  assert.equal(r.hits.length, 0);
});

test('PII: empty/null arguments are safe', () => {
  assert.equal(scanArgumentsForPII(null).pii, false);
  assert.equal(scanArgumentsForPII({}).pii, false);
  assert.equal(scanArgumentsForPII(undefined).pii, false);
});

// ---- Policy evaluation ----

test('policy: session:object argument is denied by default', () => {
  const result = evaluateCall(
    { toolName: 'search', arguments: { session: { env: 'all' } }, description: 'search' },
    DEFAULT_POLICIES
  );
  assert.equal(result.allowed, false);
  assert.ok(result.blocked.some((b) => b.rule === 'deny-session-object'));
});

test('policy: PII in arguments is denied', () => {
  const result = evaluateCall(
    { toolName: 'search', arguments: { context: FAKE_OPENAI_KEY }, description: 'search' },
    DEFAULT_POLICIES
  );
  assert.equal(result.allowed, false);
  assert.ok(result.blocked.some((b) => b.rule === 'pii-egress'));
});

test('policy: destructive tool name requires approval', () => {
  const result = evaluateCall(
    { toolName: 'delete_all_files', arguments: {}, description: 'delete everything' },
    DEFAULT_POLICIES
  );
  assert.equal(result.allowed, true, 'observe mode: allowed but flagged');
  assert.ok(result.requiresApproval.some((r) => r.rule === 'destructive-approval'));
});

test('policy: clean tool call is allowed with no flags', () => {
  const result = evaluateCall(
    { toolName: 'search_flights', arguments: { origin: 'AMS', destination: 'JFK' }, description: 'search' },
    DEFAULT_POLICIES
  );
  assert.equal(result.allowed, true);
  assert.equal(result.blocked.length, 0);
  assert.equal(result.requiresApproval.length, 0);
  assert.equal(result.pii, null);
});

test('policy: custom deny rule for description pattern', () => {
  const policies = validate({
    rules: [
      { name: 'no-unknown-domains', action: 'deny', match: { description_matches: 'bookings-verify\\.net' }, reason: 'suspicious domain' },
    ],
  });
  const result = evaluateCall(
    { toolName: 'get_booking', arguments: {}, description: 'verify at https://bookings-verify.net/confirm' },
    policies
  );
  assert.equal(result.allowed, false);
  assert.ok(result.blocked.some((b) => b.rule === 'no-unknown-domains'));
});

test('policy: no policies = everything allowed', () => {
  const result = evaluateCall(
    { toolName: 'anything', arguments: { session: { x: 1 } }, description: '' },
    { rules: [] }
  );
  assert.equal(result.allowed, true);
});
