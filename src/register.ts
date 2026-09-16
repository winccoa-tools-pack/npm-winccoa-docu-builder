import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
    ProjEnvProject,
    getAvailableWinCCOAVersions,
    getWinCCOAInstallationPathByVersion,
} from '@winccoa-tools-pack/npm-winccoa-core';
import { resolveDocuBuilderProjectPath } from './paths';

const DEFAULT_LANGS = ['en_US.utf8'];

export interface RegisterProjectsOptions {
    /** Runnable worker / source project (e.g. Squirt). */
    projectPath: string;
    /** WinCC OA version, e.g. 3.21. */
    version: string;
    /** Languages for the runnable worker project. */
    langs?: string[];
    /** DocuBuilder sub-project path (default: package winccoa/DocuBuilder). */
    docuBuilderProjectPath?: string;
    /**
     * When true, always rewrite worker config so DocuBuilder is listed as
     * sub-project before the main proj_path (even if config already exists).
     * @default true
     */
    forceRewriteConfig?: boolean;
}

export interface RegisterProjectsResult {
    docuBuilderPath: string;
    projectPath: string;
    configPath: string;
}

/**
 * Resolve a WinCC OA version: explicit, or the single installed version.
 */
export function resolveWinCCOAVersion(explicit?: string): string {
    if (explicit) {
        return explicit;
    }

    const installed = getAvailableWinCCOAVersions();
    if (installed.length === 1) {
        return installed[0];
    }
    if (installed.length === 0) {
        throw new Error(
            'WinCC OA version is required (--version); no installation detected on this host',
        );
    }
    throw new Error(
        `WinCC OA version is required (--version); multiple installations found: ${installed.join(', ')}`,
    );
}

function toUnix(p: string): string {
    return p.replace(/\\/g, '/');
}

function ensureDocuBuilderLayout(docuBuilderPath: string): string {
    const abs = path.resolve(docuBuilderPath);
    const script = path.join(abs, 'scripts', 'buildHelp.ctl');
    if (!fs.existsSync(script)) {
        throw new Error(`DocuBuilder buildHelp.ctl not found: ${script}`);
    }

    // Non-runnable sub-project: only scripts (buildHelp.ctl). No config/ or log/.
    // Worker project owns config and logs via WCCOActrl -config.
    fs.mkdirSync(path.join(abs, 'scripts'), { recursive: true });
    return abs;
}

/**
 * Register DocuBuilder as a non-runnable WinCC OA project.
 */
export async function registerDocuBuilderSubProject(
    docuBuilderPath: string,
    version: string,
): Promise<string> {
    const abs = ensureDocuBuilderLayout(docuBuilderPath);

    const project = new ProjEnvProject();
    project.setDir(abs);
    project.setVersion(version);
    project.setRunnable(false);
    project.setName('DocuBuilder');

    const rc = await project.registerProj();
    if (rc !== 0) {
        throw new Error(`Failed to register DocuBuilder as non-runnable (rc=${rc}): ${abs}`);
    }
    return abs;
}

/**
 * Write / refresh worker project config with DocuBuilder as sub-project, then
 * register the worker as runnable.
 *
 * Config shape (matches npm-winccoa-register-project --sub-project):
 *   [general]
 *   pvss_path = "..."
 *   proj_path = "<DocuBuilder>"
 *   proj_path = "<worker>"
 *   proj_version = "..."
 *   langs = "..."
 */
export async function registerWorkerProjectWithDocuBuilder(
    options: RegisterProjectsOptions,
): Promise<RegisterProjectsResult> {
    const version = resolveWinCCOAVersion(options.version);
    const projectPath = path.resolve(options.projectPath);
    const docuBuilderPath = resolveDocuBuilderProjectPath({
        workerProjectPath: projectPath,
        docuBuilderProjectPath: options.docuBuilderProjectPath,
    });
    const langs = options.langs?.length ? options.langs : DEFAULT_LANGS;
    const forceRewrite = options.forceRewriteConfig !== false;

    if (!fs.existsSync(projectPath)) {
        throw new Error(`Worker project path does not exist: ${projectPath}`);
    }

    const registeredDocuBuilder = await registerDocuBuilderSubProject(docuBuilderPath, version);

    const oaPath = getWinCCOAInstallationPathByVersion(version);
    if (!oaPath) {
        throw new Error(`Could not resolve WinCC OA installation path for version ${version}`);
    }

    const configDir = path.join(projectPath, 'config');
    const configPath = path.join(configDir, 'config');
    fs.mkdirSync(configDir, { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'log'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'help'), { recursive: true });

    const needsWrite = forceRewrite || !fs.existsSync(configPath);
    if (needsWrite) {
        const content = [
            '[general]',
            `pvss_path = "${toUnix(oaPath)}"`,
            `proj_path = "${toUnix(registeredDocuBuilder)}"`,
            `proj_path = "${toUnix(projectPath)}"`,
            `proj_version = "${version}"`,
            `langs = "${langs.join(' ')}"`,
            '',
        ].join('\n');
        fs.writeFileSync(configPath, content, 'utf8');
    } else {
        const existing = fs.readFileSync(configPath, 'utf8');
        const marker = toUnix(registeredDocuBuilder);
        if (!existing.includes(marker)) {
            throw new Error(
                `Worker config exists but does not reference DocuBuilder (${marker}). ` +
                    `Re-run with forceRewriteConfig or use scripts/register-docubuilder-projects.sh`,
            );
        }
    }

    const worker = new ProjEnvProject();
    worker.setDir(projectPath);
    worker.setVersion(version);
    worker.setRunnable(true);
    worker.setLanguages(langs as never);

    const rc = await worker.registerProj();
    if (rc !== 0) {
        throw new Error(`Failed to register worker project (rc=${rc}): ${projectPath}`);
    }

    return {
        docuBuilderPath: registeredDocuBuilder,
        projectPath,
        configPath,
    };
}

/**
 * Spawn npm-winccoa-register-project CLI (for shells / debugging).
 */
export function spawnRegisterProjectCli(args: string[]): void {
    const candidates = [
        path.resolve(
            process.cwd(),
            'node_modules',
            '@winccoa-tools-pack',
            'npm-winccoa-register-project',
            'dist',
            'cjs',
            'cli.js',
        ),
        path.resolve(
            __dirname,
            '..',
            '..',
            '..',
            'npm-winccoa-register-project',
            'dist',
            'cjs',
            'cli.js',
        ),
    ];

    const cliPath = candidates.find((p) => fs.existsSync(p));
    if (!cliPath) {
        const result = spawnSync(
            process.platform === 'win32' ? 'npx.cmd' : 'npx',
            ['@winccoa-tools-pack/npm-winccoa-register-project', ...args],
            { stdio: 'inherit', shell: true },
        );
        if (result.status !== 0) {
            throw new Error(
                `npm-winccoa-register-project failed with exit ${result.status ?? 'null'}`,
            );
        }
        return;
    }

    const result = spawnSync(process.execPath, [cliPath, ...args], {
        stdio: 'inherit',
    });
    if (result.status !== 0) {
        throw new Error(`npm-winccoa-register-project failed with exit ${result.status ?? 'null'}`);
    }
}
