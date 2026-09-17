/**
 * Conversion direction for PNL ⇄ XML transformations.
 */
export enum ConversionDirection {
    /** Convert .pnl panel files to .xml */
    PNL_TO_XML = 'XML',
    /** Convert .xml files back to .pnl panels */
    XML_TO_PNL = 'PNL',
}

/**
 * Options for the PNL ⇄ XML conversion process.
 */
export interface ConversionOptions {
    /**
     * WinCC OA version to use (e.g., '3.20').
     * Required to locate the correct WCCOAui executable.
     */
    version: string;

    /**
     * Path to the panel file (.pnl) or directory to convert.
     *
     * WCCOAui resolves this path **relative to the project's `panels/`
     * directory**, so typically a bare filename like `"about.pnl"` or a
     * sub-path like `"sub/myPanel.pnl"` is expected — not an absolute path.
     */
    inputPath: string;

    /**
     * Whether to overwrite existing output files.
     * Maps to the `-o` flag of the UI manager.
     * @default false
     */
    overwrite?: boolean;

    /**
     * Path to the WinCC OA project config file.
     * Allows WCCOAui to locate a valid project context without registration.
     * Maps to the `-config` flag of the UI manager.
     */
    configPath?: string;

    /**
     * Timeout in milliseconds for the conversion process.
     * @default 60000
     */
    timeout?: number;
}

/**
 * Result of a PNL ⇄ XML conversion operation.
 */
export interface ConversionResult {
    /** Whether the conversion completed successfully (exit code 0). */
    success: boolean;

    /** Process exit code. */
    exitCode: number;

    /** Standard output captured from the UI manager process. */
    stdout: string;

    /** Standard error output captured from the UI manager process. */
    stderr: string;

    /** The input path that was converted. */
    inputPath: string;

    /** The conversion direction used. */
    direction: ConversionDirection;
}

/**
 * Options for building WinCC OA project documentation via WCCOActrl +
 * buildHelp.ctl.
 *
 * Worker project is the runnable source project (e.g. Squirt). DocuBuilder is
 * registered as a non-runnable sub-project so scripts resolve from there while
 * logs and help output stay on the worker project.
 */
export interface DocuBuildOptions {
    /**
     * Absolute or relative path to the runnable WinCC OA source project
     * (the worker project, e.g. `src/Squirt`).
     */
    projectPath: string;

    /**
     * WinCC OA version (e.g. `3.21`).
     */
    version: string;

    /**
     * Company/organization label passed to buildHelp.ctl (GlobalStorage
     * company/name). Defaults to "WinCC OA community" when empty.
     */
    companyName?: string;

    /**
     * Languages for runnable project registration.
     * @default ['en_US.utf8']
     */
    langs?: string[];

    /**
     * Path of the DocuBuilder sub-project.
     * Defaults to the `winccoa/DocuBuilder` directory shipped with this package.
     */
    docuBuilderProjectPath?: string;

    /**
     * When true, register DocuBuilder (non-runnable) and the worker project
     * (runnable, with DocuBuilder as sub-project) before running.
     * @default true
     */
    registerProject?: boolean;

    /**
     * Timeout in milliseconds for the WCCOActrl process.
     * Docs builds can be long; default is 10 minutes.
     * @default 600000
     */
    timeout?: number;

    /**
     * Ordered paths to external `projectDocu` asset directories.
     * Contents are merged into `{projectPath}/data/projectDocu` before the
     * build so WinCC OA can discover advanced config and extras.
     *
     * Merge policy (left → right):
     * - `advanced_doxygenConfig.txt` fragments are concatenated (later keys
     *   override earlier Doxygen settings).
     * - Other top-level files use last-wins overwrite.
     *
     * Typical layering: org theme → shared extras → project overrides.
     * Repeatable CLI flag: `--project-docu <path>`.
     */
    projectDocuPaths?: string[];
}

/**
 * Result of a documentation build run.
 */
export interface DocuBuildResult {
    /** True when exit code is 0. */
    success: boolean;

    /** WCCOActrl / buildHelp exit code. */
    exitCode: number;

    /** Captured stdout. */
    stdout: string;

    /** Captured stderr (includes WinCC OA throwError / doxygen log lines). */
    stderr: string;

    /** Absolute worker project path. */
    projectPath: string;

    /** Absolute path to the worker project config file used with -config. */
    configPath: string;

    /** Company name passed to buildHelp.ctl. */
    companyName: string;
}
