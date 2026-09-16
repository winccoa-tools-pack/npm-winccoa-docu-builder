#!/usr/bin/env node

import { buildDocs } from './docu-build';
import { registerWorkerProjectWithDocuBuilder } from './register';
import type { DocuBuildOptions } from './types';

const EXIT_OK = 0;
const EXIT_USAGE = 1;
const EXIT_FAILED = 2;

export interface ParsedCliArgs {
    command: 'build' | 'register';
    projectPath: string;
    version?: string;
    companyName?: string;
    langs?: string[];
    docuBuilderProjectPath?: string;
    registerProject: boolean;
    timeout?: number;
}

export function printUsage(): void {
    const bin = 'winccoa-docu-builder';
    process.stderr.write(
        [
            '',
            'Usage: ' + bin + ' <command> <projectPath> [options]',
            '',
            'Commands:',
            '  build <projectPath>      Build WinCC OA help/docs via buildHelp.ctl',
            '  register <projectPath>   Register DocuBuilder + worker project only',
            '',
            'Options:',
            '  -v, --version <ver>            WinCC OA version (e.g. 3.21)',
            '  -c, --company <name>           Company label for buildHelp.ctl',
            '  --langs <csv>                  Worker project langs (default: en_US.utf8)',
            '  --docu-builder-path <path>     DocuBuilder sub-project (default: package)',
            '  --no-register                  Skip registration (use existing worker config)',
            '  -t, --timeout <ms>             WCCOActrl timeout in ms (default: 600000)',
            '  -h, --help                     Show this help',
            '',
            'Examples:',
            '  ' + bin + ' register ./src/Squirt -v 3.21',
            '  ' + bin + ' build ./src/Squirt -v 3.21 -c "winccoa-tools-pack"',
            '',
            'Flow:',
            '  1. Register bundled DocuBuilder as non-runnable',
            '  2. Register worker project as runnable with DocuBuilder as sub-project',
            '  3. WCCOActrl -config <worker>/config/config -n -log +stderr buildHelp.ctl <Company>',
            '',
            '  Logs and help output stay on the worker project, not DocuBuilder.',
            '  v1 builds docs from the runner/worker project only.',
            '',
            'Local helper script:',
            '  ./scripts/register-docubuilder-projects.sh --project-path ./src/Squirt -v 3.21',
            '',
        ].join('\n'),
    );
}

export function parseArgs(argv: string[]): ParsedCliArgs | null {
    const args = argv.slice(2);

    if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
        return null;
    }

    const commandRaw = args[0];
    if (commandRaw !== 'build' && commandRaw !== 'register') {
        process.stderr.write(
            'Error: Unknown command "' + commandRaw + '". Expected "build" or "register".\n',
        );
        return null;
    }

    const projectPath = args[1];
    if (!projectPath || projectPath.startsWith('-')) {
        process.stderr.write('Error: Missing projectPath.\n');
        return null;
    }

    let version: string | undefined;
    let companyName: string | undefined;
    let langs: string[] | undefined;
    let docuBuilderProjectPath: string | undefined;
    let registerProject = true;
    let timeout: number | undefined;

    let i = 2;
    while (i < args.length) {
        const flag = args[i];
        switch (flag) {
            case '-v':
            case '--version':
                version = args[++i] ?? '';
                break;
            case '-c':
            case '--company':
                companyName = args[++i] ?? '';
                break;
            case '--langs': {
                const raw = args[++i] ?? '';
                langs = raw
                    .split(/[ ,]+/)
                    .map((s) => s.trim())
                    .filter(Boolean);
                break;
            }
            case '--docu-builder-path':
                docuBuilderProjectPath = args[++i] ?? '';
                break;
            case '--no-register':
                registerProject = false;
                break;
            case '-t':
            case '--timeout': {
                const raw = args[++i] ?? '';
                const parsed = Number(raw);
                if (Number.isNaN(parsed) || parsed <= 0) {
                    process.stderr.write('Error: Invalid timeout value "' + raw + '".\n');
                    return null;
                }
                timeout = parsed;
                break;
            }
            default:
                process.stderr.write('Error: Unknown option "' + flag + '".\n');
                return null;
        }
        i++;
    }

    return {
        command: commandRaw,
        projectPath,
        version: version || undefined,
        companyName: companyName || undefined,
        langs,
        docuBuilderProjectPath: docuBuilderProjectPath || undefined,
        registerProject,
        timeout,
    };
}

export async function main(argv: string[] = process.argv): Promise<number> {
    const parsed = parseArgs(argv);

    if (!parsed) {
        printUsage();
        return EXIT_USAGE;
    }

    try {
        if (parsed.command === 'register') {
            process.stderr.write(
                'Registering DocuBuilder + worker project ' + parsed.projectPath + '\n',
            );
            const result = await registerWorkerProjectWithDocuBuilder({
                projectPath: parsed.projectPath,
                version: parsed.version ?? '',
                langs: parsed.langs,
                docuBuilderProjectPath: parsed.docuBuilderProjectPath,
                forceRewriteConfig: true,
            });
            process.stderr.write('Registered worker config: ' + result.configPath + '\n');
            process.stderr.write('DocuBuilder sub-project: ' + result.docuBuilderPath + '\n');
            return EXIT_OK;
        }

        const options: DocuBuildOptions = {
            projectPath: parsed.projectPath,
            version: parsed.version ?? '',
            companyName: parsed.companyName,
            langs: parsed.langs,
            docuBuilderProjectPath: parsed.docuBuilderProjectPath,
            registerProject: parsed.registerProject,
            timeout: parsed.timeout,
        };

        process.stderr.write('Building docs for project ' + parsed.projectPath + '\n');

        const result = await buildDocs(options);

        if (result.stdout) {
            process.stdout.write(result.stdout);
            if (!result.stdout.endsWith('\n')) {
                process.stdout.write('\n');
            }
        }
        if (result.stderr) {
            process.stderr.write(result.stderr);
            if (!result.stderr.endsWith('\n')) {
                process.stderr.write('\n');
            }
        }

        if (result.success) {
            process.stderr.write('Documentation build completed successfully.\n');
            return EXIT_OK;
        }

        process.stderr.write(
            'Documentation build failed with exit code ' + result.exitCode + '.\n',
        );
        return EXIT_FAILED;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write('Error: ' + message + '\n');
        return EXIT_FAILED;
    }
}

const isDirectRun =
    !!process.argv[1] &&
    (process.argv[1].endsWith('cli.js') ||
        process.argv[1].endsWith('cli.ts') ||
        process.argv[1].endsWith('cli.cjs') ||
        process.argv[1].endsWith('cli.mjs'));

if (isDirectRun) {
    main()
        .then((code) => {
            process.exit(code);
        })
        .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            process.stderr.write('Error: ' + message + '\n');
            process.exit(EXIT_FAILED);
        });
}
