#!/usr/bin/env python3
"""Offline fixture demo of an already installed RugSnare CLI. No npm downloads."""
import argparse, json, pathlib, subprocess, tempfile, time
p = argparse.ArgumentParser()
p.add_argument('--cli', type=pathlib.Path, required=True, help='installed rugsnare/src/cli.js')
p.add_argument('--evidence', type=pathlib.Path, help='save exact commands and output as JSON')
a = p.parse_args(); cli = a.cli.resolve(); records = []; started = time.monotonic()
if not cli.is_file(): p.error('CLI file does not exist')
with tempfile.TemporaryDirectory(prefix='rugsnare-launch-demo-') as tmp:
    cwd = pathlib.Path(tmp)
    server = cwd / 'fixture.cjs'
    server.write_text('''const fs = require('node:fs');
if (fs.existsSync('broken')) process.exit(1);
const rl = require('node:readline').createInterface({ input: process.stdin });
rl.on('line', line => {
 const m = JSON.parse(line); if (m.id === undefined) return;
 const result = m.method === 'initialize' ? {protocolVersion:'2025-06-18',capabilities:{},serverInfo:{name:'local-demo',version:'1'}}
 : m.method === 'tools/list' ? {tools:[{name:'read_demo',description:fs.readFileSync('description.txt','utf8'),inputSchema:{type:'object'}}]}
 : m.method === 'prompts/list' ? {prompts:[]} : m.method === 'resources/list' ? {resources:[]} : {};
 process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:m.id,result})+'\\n');
});
''')
    (cwd/'description.txt').write_text('Read the local demo record.')
    (cwd/'mcp.json').write_text(json.dumps({'mcpServers':{'local-demo':{'command':'node','args':[str(server)]}}}))
    def run(label, args, expected):
        command = ['node', str(cli), *args]
        r = subprocess.run(command, cwd=cwd, text=True, capture_output=True, timeout=15)
        records.append(dict(label=label,command=command,expected_exit=expected,actual_exit=r.returncode,stdout=r.stdout,stderr=r.stderr))
        print(f'{label}: exit {r.returncode} (expected {expected})')
        print(r.stdout+r.stderr, end='')
        if r.returncode != expected: raise RuntimeError(f'{label}: unexpected exit')
        return r
    version = run('version',['--version'],0)
    if version.stdout.strip() != 'rugsnare 1.5.0': raise RuntimeError('This recorded demo is for published rugsnare@1.5.0')
    run('scan',['scan','--config','mcp.json'],0)
    run('unchanged',['diff','--config','mcp.json'],0)
    (cwd/'description.txt').write_text('Read the local demo record with an additional field.')
    changed = run('changed description',['diff','--config','mcp.json'],1)
    if 'DRIFT' not in changed.stdout+changed.stderr: raise RuntimeError('Expected a drift finding')
    run('invalid config',['scan','--config','missing.json'],2)
    (cwd/'broken').write_text('fixture exits before handshake')
    run('unavailable fixture',['diff','--config','mcp.json','--timeout','1000'],3)
report = dict(version='1.5.0',elapsed_seconds=round(time.monotonic()-started,3),checks=records)
if a.evidence: a.evidence.parent.mkdir(parents=True,exist_ok=True); a.evidence.write_text(json.dumps(report,indent=2)+'\n')
print(f"Completed in {report['elapsed_seconds']} seconds. Fixtures and pin store removed.")
