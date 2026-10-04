import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.js');

function tmpCwd() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-config-'));
  return { dir, cleanup: () => { try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch { /* Windows */ } } };
}

function runCli(cwd, args) {
  return new Promise((resolve) => {
    execFile('node', [CLI, ...args], { cwd, timeout: 60000 }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout, stderr });
    });
  });
}

test('config set/get roundtrip persists to .rugsnare/config.json', async () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const set = await runCli(dir, ['config', 'set', 'mode', 'enforce']);
    assert.equal(set.code, 0, set.stderr);
    assert.match(set.stdout, /mode = "enforce"/);

    const get = await runCli(dir, ['config', 'get', 'mode']);
    assert.equal(get.code, 0);
    assert.equal(get.stdout.trim(), '"enforce"');

    const onDisk = JSON.parse(fs.readFileSync(path.join(dir, '.rugsnare', 'config.json'), 'utf8'));
    assert.equal(onDisk.mode, 'enforce');
  } finally {
    cleanup();
  }
});

test('config: every documented key roundtrips with its real type', async () => {
  const { dir, cleanup } = tmpCwd();
  try {
    await runCli(dir, ['config', 'set', 'failMode', 'closed']);
    await runCli(dir, ['config', 'set', 'logCallArgs', 'true']);
    await runCli(dir, ['config', 'set', 'loopThreshold', '3']);
    await runCli(dir, ['config', 'set', 'alertWebhook', 'https://hooks.slack.com/services/X/Y/Z']);
    const list = await runCli(dir, ['config', 'list']);
    assert.match(list.stdout, /failMode: "closed"/);
    assert.match(list.stdout, /logCallArgs: true/);
    assert.match(list.stdout, /loopThreshold: 3/);
    assert.match(list.stdout, /alertWebhook: "https:\/\/hooks\.slack\.com/);
    const onDisk = JSON.parse(fs.readFileSync(path.join(dir, '.rugsnare', 'config.json'), 'utf8'));
    assert.equal(onDisk.logCallArgs, true, 'boolean, not string');
    assert.equal(onDisk.loopThreshold, 3, 'number, not string');
  } finally {
    cleanup();
  }
});

test('config: invalid values are rejected before touching the file (exit 2)', async () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const badMode = await runCli(dir, ['config', 'set', 'mode', 'strict']);
    assert.equal(badMode.code, 2);
    assert.match(badMode.stderr, /observe, enforce/);

    const badBool = await runCli(dir, ['config', 'set', 'logCallArgs', 'yes']);
    assert.equal(badBool.code, 2);
    assert.match(badBool.stderr, /true or false/);

    const badInt = await runCli(dir, ['config', 'set', 'loopThreshold', '-1']);
    assert.equal(badInt.code, 2);
    assert.match(badInt.stderr, /non-negative integer/);

    const badUrl = await runCli(dir, ['config', 'set', 'alertWebhook', 'ftp://hooks.example.com/x']);
    assert.equal(badUrl.code, 2);
    assert.match(badUrl.stderr, /http\(s\)/);

    const unknown = await runCli(dir, ['config', 'set', 'evilKey', '1']);
    assert.equal(unknown.code, 2);

    // nothing was written by the failed sets
    assert.ok(!fs.existsSync(path.join(dir, '.rugsnare', 'config.json')), 'rejected values must not create/modify the config');
  } finally {
    cleanup();
  }
});

test('config: alertWebhook "none" clears it back to null', async () => {
  const { dir, cleanup } = tmpCwd();
  try {
    await runCli(dir, ['config', 'set', 'alertWebhook', 'https://example.com/hook']);
    const clear = await runCli(dir, ['config', 'set', 'alertWebhook', 'none']);
    assert.equal(clear.code, 0, clear.stderr);
    const get = await runCli(dir, ['config', 'get', 'alertWebhook']);
    assert.equal(get.stdout.trim(), 'null');
  } finally {
    cleanup();
  }
});
