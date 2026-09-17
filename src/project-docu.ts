import fs from 'node:fs';
import path from 'node:path';

export const WORKER_PROJECT_DOCU_REL = path.join('data', 'projectDocu');

export const ADVANCED_DOXYGEN_CONFIG = 'advanced_doxygenConfig.txt';

export interface ProjectDocuMergeResult {
    targetDir: string;
    sourceDirs: string[];
    writtenFiles: string[];
    advancedConfigPath?: string;
}

export function normalizeProjectDocuPaths(
    paths: string[] | undefined,
    cwd: string = process.cwd(),
): string[] {
    if (!paths?.length) {
        return [];
    }

    return paths
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter(Boolean)
        .map((entry) => path.resolve(cwd, entry));
}

export function listProjectDocuFiles(dir: string): string[] {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
        return [];
    }

    return fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));
}

export function mergeProjectDocuSources(
    workerProjectPath: string,
    sourcePaths: string[] | undefined,
): ProjectDocuMergeResult {
    const workerRoot = path.resolve(workerProjectPath);
    const targetDir = path.join(workerRoot, WORKER_PROJECT_DOCU_REL);
    const sources = normalizeProjectDocuPaths(sourcePaths);

    if (sources.length === 0) {
        const advancedConfigPath = path.join(targetDir, ADVANCED_DOXYGEN_CONFIG);
        return {
            targetDir,
            sourceDirs: [],
            writtenFiles: listProjectDocuFiles(targetDir),
            advancedConfigPath: fs.existsSync(advancedConfigPath)
                ? advancedConfigPath
                : undefined,
        };
    }

    for (const src of sources) {
        if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) {
            throw new Error(`projectDocu path does not exist or is not a directory: ${src}`);
        }
    }

    fs.mkdirSync(targetDir, { recursive: true });

    const advancedChunks: string[] = [];
    const written = new Set<string>();

    for (const src of sources) {
        for (const name of listProjectDocuFiles(src)) {
            const from = path.join(src, name);
            const to = path.join(targetDir, name);

            if (name === ADVANCED_DOXYGEN_CONFIG) {
                const body = fs.readFileSync(from, 'utf8').replace(/^\uFEFF/, '');
                advancedChunks.push(
                    `# --- projectDocu source: ${src.replace(/\\/g, '/')} ---\n${body.trimEnd()}\n`,
                );
                written.add(name);
                continue;
            }

            fs.copyFileSync(from, to);
            written.add(name);
        }
    }

    let advancedConfigPath: string | undefined;
    if (advancedChunks.length > 0) {
        advancedConfigPath = path.join(targetDir, ADVANCED_DOXYGEN_CONFIG);
        fs.writeFileSync(
            advancedConfigPath,
            [
                '# Merged by @winccoa-tools-pack/npm-winccoa-docu-builder',
                '# Sources applied top to bottom; later Doxygen keys override earlier ones.',
                '',
                ...advancedChunks,
            ].join('\n'),
            'utf8',
        );
    }

    return {
        targetDir,
        sourceDirs: sources,
        writtenFiles: [...written].sort((left, right) => left.localeCompare(right)),
        advancedConfigPath,
    };
}

export function substituteDoxygenVersionInFile(
    advancedConfigPath: string,
    version: string,
): boolean {
    if (!fs.existsSync(advancedConfigPath)) {
        return false;
    }

    const original = fs.readFileSync(advancedConfigPath, 'utf8');
    if (!original.includes('%WINCCOA_VERSION%')) {
        return false;
    }

    fs.writeFileSync(
        advancedConfigPath,
        original.split('%WINCCOA_VERSION%').join(version),
        'utf8',
    );
    return true;
}