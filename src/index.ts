/**
 * @winccoa-tools-pack/npm-winccoa-docu-builder
 *
 * Build WinCC OA project documentation via WCCOActrl + buildHelp.ctl.
 * Worker project is runnable; DocuBuilder is a non-runnable sub-project.
 */

export type { DocuBuildOptions, DocuBuildResult } from './types';
export type { RegisterProjectsOptions, RegisterProjectsResult } from './register';
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
export { parseArgs, printUsage, main } from './cli';
