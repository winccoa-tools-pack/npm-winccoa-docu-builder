/**
 * @winccoa-tools-pack/npm-winccoa-docu-builder
 *
 * Build WinCC OA project documentation via WCCOActrl + buildHelp.ctl.
 * Worker project is runnable; DocuBuilder is a non-runnable sub-project.
 */

export type { DocuBuildOptions, DocuBuildResult } from './types';
export type { RegisterProjectsOptions, RegisterProjectsResult } from './register';
export type { ProjectDocuMergeResult } from './project-docu';
export {
    runDocuBuild,
    buildDocs,
    buildCtrlArgs,
    substituteDoxygenVersionPlaceholders,
    BUILD_HELP_SCRIPT,
} from './docu-build';
export {
    getPackageRoot,
    getDefaultDocuBuilderProjectPath,
    getBuildHelpScriptPath,
    isTransientDocuBuilderPath,
    getDurableDocuBuilderProjectPath,
    materializeDocuBuilderProject,
    resolveDocuBuilderProjectPath,
} from './paths';
export {
    registerDocuBuilderSubProject,
    registerWorkerProjectWithDocuBuilder,
    resolveWinCCOAVersion,
    spawnRegisterProjectCli,
} from './register';
export {
    ADVANCED_DOXYGEN_CONFIG,
    WORKER_PROJECT_DOCU_REL,
    listProjectDocuFiles,
    mergeProjectDocuSources,
    normalizeProjectDocuPaths,
    substituteDoxygenVersionInFile,
} from './project-docu';
export { expandProjectDocuArg, parseArgs, printUsage, main } from './cli';
