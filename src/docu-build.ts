import fs from 'node:fs';
import path from 'node:path';
import { CtrlComponent } from '@winccoa-tools-pack/npm-winccoa-core/types/components/implementations/CtrlComponent';
import type { DocuBuildOptions, DocuBuildResult } from './types';
import { getBuildHelpScriptPath, resolveDocuBuilderProjectPath } from './paths';
import { registerWorkerProjectWithDocuBuilder, resolveWinCCOAVersion } from './register';

/** Default 10 minutes — doxygen builds can be slow. */
const DEFAULT_TIMEOUT = 600_000;

const DEFAULT_COMPANY = 'WinCC OA community';

/** Script name relative to DocuBuilder scripts/ (OA proj_path resolution). */
export const BUILD_HELP_SCRIPT = 'buildHelp.ctl';

/**
 * Build WCCOActrl argv for buildHelp.ctl against the worker project config.
 *
 *   WCCOActrl -config <worker>/config/config -n -log +stderr buildHelp.ctl <CompanyName>
 *
 * Script is always the bare name `buildHelp.ctl` (resolved via DocuBuilder on
 * proj_path). Worker project is runnable; logs and help stay on the worker.
 */
export function buildCtrlArgs(options: {
    configPath: string;
    companyName: string;
    /** @default BUILD_HELP_SCRIPT (`buildHelp.ctl`) */
    scriptName?: string;
}): string[] {
    return [
        '-config',
        options.configPath,
        '-n',
        '-log',
        '+stderr',
        options.scriptName ?? BUILD_HELP_SCRIPT,
        options.companyName,
    ];
}

/**
 * Optionally rewrite `%WINCCOA_VERSION%` placeholders in the worker project's
 * advanced doxygen config when present.
 */
export function substituteDoxygenVersionPlaceholders(
    projectPath: string,
    version: string,
): string | undefined {
    const docConfig = path.join(projectPath, 'data', 'projectDocu', 'advanced_doxygenConfig.txt');
    if (!fs.existsSync(docConfig)) {
        return undefined;
    }
    const original = fs.readFileSync(docConfig, 'utf8');
    if (!original.includes('%WINCCOA_VERSION%')) {
        return docConfig;
    }
    const updated = original.split('%WINCCOA_VERSION%').join(version);
    fs.writeFileSync(docConfig, updated, 'utf8');
    return docConfig;
}

/**
 * Build WinCC OA project documentation via worker + DocuBuilder sub-project.
 */
export async function runDocuBuild(options: DocuBuildOptions): Promise<DocuBuildResult> {
    const version = resolveWinCCOAVersion(options.version);
    const projectPath = path.resolve(options.projectPath);
    const companyName =
        options.companyName && options.companyName.trim()
            ? options.companyName.trim()
            : DEFAULT_COMPANY;
    const docuBuilderPath = resolveDocuBuilderProjectPath({
        workerProjectPath: projectPath,
        docuBuilderProjectPath: options.docuBuilderProjectPath,
    });
    const bundledScriptPath = getBuildHelpScriptPath(docuBuilderPath);
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;
    const registerProject = options.registerProject !== false;

    if (!fs.existsSync(projectPath)) {
        throw new Error(`projectPath does not exist: ${projectPath}`);
    }
    if (!fs.existsSync(bundledScriptPath)) {
        throw new Error(`buildHelp.ctl not found: ${bundledScriptPath}`);
    }

    let configPath = path.join(projectPath, 'config', 'config');

    if (registerProject) {
        const registered = await registerWorkerProjectWithDocuBuilder({
            projectPath,
            version,
            langs: options.langs,
            docuBuilderProjectPath: docuBuilderPath,
            forceRewriteConfig: true,
        });
        configPath = registered.configPath;
    }

    if (!fs.existsSync(configPath)) {
        throw new Error(
            `Worker project config not found: ${configPath}. Register first ` +
                `(registerProject or scripts/register-docubuilder-projects.sh).`,
        );
    }

    configPath = path.resolve(configPath);
    fs.mkdirSync(path.join(projectPath, 'log'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'help'), { recursive: true });

    substituteDoxygenVersionPlaceholders(projectPath, version);

    const ctrl = new CtrlComponent();
    ctrl.setVersion(version);

    const args = buildCtrlArgs({
        configPath,
        companyName,
    });

    const exitCode = await ctrl.start(args, { timeout });

    return {
        success: exitCode === 0,
        exitCode,
        stdout: ctrl.stdOut ?? '',
        stderr: ctrl.stdErr ?? '',
        projectPath,
        configPath,
        companyName,
    };
}

/**
 * Alias for {@link runDocuBuild}.
 */
export async function buildDocs(options: DocuBuildOptions): Promise<DocuBuildResult> {
    return runDocuBuild(options);
}
