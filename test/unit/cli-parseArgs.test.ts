import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { parseArgs } from '../../src/cli';
import { buildCtrlArgs, substituteDoxygenVersionPlaceholders } from '../../src/docu-build';
import {
    getBuildHelpScriptPath,
    getDefaultDocuBuilderProjectPath,
    getPackageRoot,
    isTransientDocuBuilderPath,
    materializeDocuBuilderProject,
} from '../../src/paths';

test('parseArgs: returns null for --help', () => {
    const parsed = parseArgs(['node', 'cli.ts', '--help']);
    assert.equal(parsed, null);
});

test('parseArgs: parses build with version and company', () => {
    const parsed = parseArgs([
        'node',
        'cli.ts',
        'build',
        './src/Squirt',
        '--version',
        '3.21',
        '--company',
        'winccoa-tools-pack',
        '--timeout',
        '90000',
    ]);

    assert.ok(parsed);
    assert.equal(parsed.command, 'build');
    assert.equal(parsed.projectPath, './src/Squirt');
    assert.equal(parsed.version, '3.21');
    assert.equal(parsed.companyName, 'winccoa-tools-pack');
    assert.equal(parsed.timeout, 90000);
    assert.equal(parsed.registerProject, true);
});

test('parseArgs: register and --no-register', () => {
    const parsed = parseArgs([
        'node',
        'cli.ts',
        'register',
        'C:/code/Squirt',
        '-v',
        '3.21',
        '--no-register',
        '--langs',
        'en_US.utf8,de_AT.utf8',
    ]);

    assert.ok(parsed);
    assert.equal(parsed.command, 'register');
    assert.equal(parsed.registerProject, false);
    assert.deepEqual(parsed.langs, ['en_US.utf8', 'de_AT.utf8']);
});

test('parseArgs: rejects unknown command', () => {
    const originalWrite = process.stderr.write.bind(process.stderr);
    (process.stderr.write as unknown as (c: string) => boolean) = () => true;
    try {
        const parsed = parseArgs(['node', 'cli.ts', 'convert', './x']);
        assert.equal(parsed, null);
    } finally {
        process.stderr.write = originalWrite;
    }
});

test('buildCtrlArgs: uses -config, bare script, company', () => {
    const args = buildCtrlArgs({
        configPath: '/repo/src/Squirt/config/config',
        companyName: 'winccoa-tools-pack',
    });
    assert.deepEqual(args, [
        '-config',
        '/repo/src/Squirt/config/config',
        '-n',
        '-log',
        '+stderr',
        'buildHelp.ctl',
        'winccoa-tools-pack',
    ]);
});

test('paths: package root resolves DocuBuilder and buildHelp.ctl', () => {
    const root = getPackageRoot();
    const project = getDefaultDocuBuilderProjectPath();
    const script = getBuildHelpScriptPath();
    assert.ok(fs.existsSync(project), project);
    assert.ok(fs.existsSync(script), script);
    assert.equal(path.basename(project), 'DocuBuilder');
    assert.equal(path.basename(script), 'buildHelp.ctl');
    assert.ok(root.length > 0);
});

test('paths: transient DocuBuilder detection', () => {
    assert.equal(
        isTransientDocuBuilderPath('/tmp/tmp.abc/node_modules/@scope/pkg/winccoa/DocuBuilder'),
        true,
    );
    assert.equal(isTransientDocuBuilderPath(getDefaultDocuBuilderProjectPath()), false);
});

test('paths: materialize DocuBuilder copies buildHelp.ctl', () => {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'docubuilder-'));
    try {
        const out = materializeDocuBuilderProject(dest);
        assert.equal(path.resolve(out), path.resolve(dest));
        assert.ok(fs.existsSync(getBuildHelpScriptPath(out)));
    } finally {
        fs.rmSync(dest, { recursive: true, force: true });
    }
});

test('substituteDoxygenVersionPlaceholders rewrites token when present', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'doxy-'));
    try {
        const cfgDir = path.join(tmp, 'data', 'projectDocu');
        fs.mkdirSync(cfgDir, { recursive: true });
        const cfg = path.join(cfgDir, 'advanced_doxygenConfig.txt');
        fs.writeFileSync(cfg, 'PROJECT_NUMBER = %WINCCOA_VERSION%\n', 'utf8');
        const out = substituteDoxygenVersionPlaceholders(tmp, '3.21');
        assert.equal(out, cfg);
        assert.equal(fs.readFileSync(cfg, 'utf8'), 'PROJECT_NUMBER = 3.21\n');
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
});

test('helper scripts exist', () => {
    const sh = path.join(getPackageRoot(), 'scripts', 'register-docubuilder-projects.sh');
    const ps1 = path.join(getPackageRoot(), 'scripts', 'register-docubuilder-projects.ps1');
    assert.ok(fs.existsSync(sh), sh);
    assert.ok(fs.existsSync(ps1), ps1);
});
