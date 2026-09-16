import fs from 'node:fs';
import path from 'node:path';

/**
 * Resolve the package root that contains `winccoa/DocuBuilder`.
 * Works from source (`src/`) and built layouts (`dist/cjs`, `dist/esm`).
 */
export function getPackageRoot(startDir?: string): string {
    let dir = path.resolve(startDir ?? __dirname);

    for (let i = 0; i < 8; i++) {
        const candidate = path.join(dir, 'winccoa', 'DocuBuilder');
        const pkgJson = path.join(dir, 'package.json');
        if (fs.existsSync(candidate) && fs.existsSync(pkgJson)) {
            return dir;
        }
        if (fs.existsSync(candidate)) {
            return dir;
        }
        const parent = path.dirname(dir);
        if (parent === dir) {
            break;
        }
        dir = parent;
    }

    // Last resort: two levels up from dist/{cjs|esm} or one from src
    return path.resolve(__dirname, '..', '..');
}

/**
 * Absolute path to the bundled DocuBuilder WinCC OA subproject.
 */
export function getDefaultDocuBuilderProjectPath(): string {
    return path.join(getPackageRoot(), 'winccoa', 'DocuBuilder');
}

/**
 * Absolute path to buildHelp.ctl inside the DocuBuilder project.
 * Used to verify the bundled script exists. WCCOActrl must receive the bare
 * name `buildHelp.ctl` (relative to scripts/), not this full path.
 */
export function getBuildHelpScriptPath(projectPath?: string): string {
    const root = projectPath ?? getDefaultDocuBuilderProjectPath();
    return path.join(root, 'scripts', 'buildHelp.ctl');
}

/**
 * True when DocuBuilder lives under a transient install (npm prefix /tmp,
 * node_modules). Those paths vanish across Docker runs and must not be written
 * into the worker project config.
 */
export function isTransientDocuBuilderPath(docuBuilderPath: string): boolean {
    const normalized = path.resolve(docuBuilderPath).replace(/\\/g, '/').toLowerCase();
    return (
        normalized.includes('/node_modules/') ||
        normalized.includes('/tmp/') ||
        normalized.includes('/temp/') ||
        /\/tmp\./.test(normalized)
    );
}

/**
 * Default durable DocuBuilder location next to the worker checkout so Docker
 * volume mounts keep proj_path valid across containers.
 *
 * Prefer GITHUB_WORKSPACE/.artifacts/DocuBuilder when set.
 */
export function getDurableDocuBuilderProjectPath(workerProjectPath: string): string {
    const workspace = process.env.GITHUB_WORKSPACE;
    if (workspace && workspace.trim()) {
        return path.resolve(workspace, '.artifacts', 'DocuBuilder');
    }
    // worker = .../src/Squirt -> .../src/.artifacts/DocuBuilder
    return path.resolve(workerProjectPath, '..', '.artifacts', 'DocuBuilder');
}

/**
 * Copy bundled DocuBuilder scripts into targetDir (scripts/buildHelp.ctl).
 * Returns the absolute target directory.
 */
export function materializeDocuBuilderProject(
    targetDir: string,
    sourceDir: string = getDefaultDocuBuilderProjectPath(),
): string {
    const src = path.resolve(sourceDir);
    const dest = path.resolve(targetDir);
    const srcScript = getBuildHelpScriptPath(src);
    if (!fs.existsSync(srcScript)) {
        throw new Error(`Bundled buildHelp.ctl not found: ${srcScript}`);
    }

    const destScripts = path.join(dest, 'scripts');
    fs.mkdirSync(destScripts, { recursive: true });
    fs.copyFileSync(srcScript, path.join(destScripts, 'buildHelp.ctl'));
    return dest;
}

/**
 * Resolve DocuBuilder path for registration: explicit path, or materialize a
 * durable copy when the package default would be transient.
 */
export function resolveDocuBuilderProjectPath(options: {
    workerProjectPath: string;
    docuBuilderProjectPath?: string;
}): string {
    if (options.docuBuilderProjectPath) {
        const explicit = path.resolve(options.docuBuilderProjectPath);
        if (isTransientDocuBuilderPath(explicit)) {
            const durable = getDurableDocuBuilderProjectPath(options.workerProjectPath);
            return materializeDocuBuilderProject(durable, explicit);
        }
        return explicit;
    }

    const bundled = getDefaultDocuBuilderProjectPath();
    if (!isTransientDocuBuilderPath(bundled)) {
        // Dev checkout / local package: use in place.
        return path.resolve(bundled);
    }

    const durable = getDurableDocuBuilderProjectPath(options.workerProjectPath);
    return materializeDocuBuilderProject(durable, bundled);
}
