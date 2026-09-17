import fs from 'node:fs';
import path from 'node:path';

/** Relative worker path where WinCC OA DoxygenConfig looks for projectDocu assets. */
export const WORKER_PROJECT_DOCU_REL = path.join('data', 'projectDocu');

/** Advanced fragment appended by OA when GlobalStorage doxygen/advancedConfig=1. */
export const ADVANCED_DOXYGEN_CONFIG = 'advanced_doxygenConfig.txt';

export interface ProjectDocuMergeResult {
    /** Absolute worker projectDocu directory that was written. */
    targetDir: string;
    /** Absolute source directories that contributed files (in merge order). */
    sourceDirs: string[];
    /** Relative file names written into targetDir. */
    writtenFiles: string[];
    /** Absolute path to advanced_doxygenConfig.txt when produced. */
    advancedConfigPath?: string;
}

/**
 * Normalize a list of projectDocu roots: trim, drop empties, resolve absolute.
 * Preserves order; does not de-duplicate (callers may intentionally layer).
 */
export function normalizeProjectDocuPaths(
    paths: string[] | undefined,
    cwd: string = process.cwd(),
): string[] {
    if (!paths?.length) {
        return [];
    }
    return paths
        .map((p) => (typeof p === 'string' ? p.trim() : ''))
        .filter(Boolean)
        .map((p) => path.resolve(cwd, p));
}

/**
 * List top-level files in a projectDocu directory (non-recursive).
 * Directories are skipped; OA only loads sibling extras next to advanced config.
 */
export function listProjectDocuFiles(dir: string): string[] {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
        return [];
    }
    return fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isFile())
        .map((e) => e.name)
        .sort((a, b) => a.localeCompare(b));
}

function readUtf8(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8');
}

/**
 * Merge one or more external projectDocu directories into the worker project's
 * `data/projectDocu` so WinCC OA DoxygenConfig can discover them.
 *
 * Merge rules (sources applied left → right):
 * - `advanced_doxygenConfig.txt`: **concatenate** in order (later overrides
 *   earlier Doxygen keys). Each chunk is marked with a source banner.
 * - All other top-level files: **last source wins** (overwrite).
 *
 * When `sourcePaths` is empty, this is a no-op and returns the existing
 * worker projectDocu path without changes.
 *
 * @param workerProjectPath Runnable worker root (e.g. Squirt).
 * @param sourcePaths Ordered projectDocu roots (org theme → shared → project).
 */
export function mergeProjectDocuSources(
    workerProjectPath: string,
    sourcePaths: string[] | undefined,
): ProjectDocuMergeResult {
    const workerRoot = path.resolve(workerProjectPath);
    const targetDir = path.join(workerRoot, WORKER_PROJECT_DOCU_REL);
    const sources = normalizeProjectDocuPaths(sourcePaths);

    if (sources.length === 0) {
        return {
            targetDir,
            sourceDirs: [],
            writtenFiles: listProjectDocuFiles(targetDir),
            advancedConfigPath: fs.existsSync(path.join(targetDir, ADVANCED_DOXYGEN_CONFIG))
                ? path.join(targetDir, ADVANCED_DOXYGEN_CONFIG)
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
        const files = listProjectDocuFiles(src);
        for (const name of files) {
            const from = path.join(src, name);
            const to = path.join(targetDir, name);

            if (name === ADVANCED_DOXYGEN_CONFIG) {
                const body = readUtf8(from).replace(/^\uFEFF/, '');
                const banner = `# --- projectDocu source: ${src.replace(/\\/g, '/')} ---\n`;
                advancedChunks.push(`${banner}${body.trimEnd()}\n`);
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
        const merged = [
            '# Merged by @winccoa-tools-pack/npm-winccoa-docu-builder',
            '# Sources applied top → bottom; later Doxygen keys override earlier ones.',
            '',
            ...advancedChunks,
        ].join('\n');
        fs.writeFileSync(advancedConfigPath, merged, 'utf8');
    }

    return {
        targetDir,
        sourceDirs: sources,
        writtenFiles: [...written].sort((a, b) => a.localeCompare(b)),
        advancedConfigPath,
    };
}

/**
 * Rewrite `%WINCCOA_VERSION%` in advanced_doxygenConfig.txt under a projectDocu
 * directory (or under worker/data/projectDocu when only worker path is given).
 */
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
    const updated = original.split('%WINCCOA_VERSION%').join(version);
    fs.writeFileSync(advancedConfigPath, updated, 'utf8');
    return true;
}
