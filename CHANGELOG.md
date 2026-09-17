# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-09-17

### Fixed

- Restore `--project-docu` CLI support in the published package and merge
	external `projectDocu` sources into the worker project before docs builds

## [0.2.0] - 2026-09-17

### Added

- Repeatable `--project-docu <path>` CLI option and `DocuBuildOptions.projectDocuPaths`
- Merge external projectDocu directories into `{worker}/data/projectDocu` before build (org theme + project overrides)
- `advanced_doxygenConfig.txt` fragments are concatenated in path order; other top-level files use last-wins overwrite
- Public helpers: `mergeProjectDocuSources`, `normalizeProjectDocuPaths`, `listProjectDocuFiles`, `substituteDoxygenVersionInFile`

## [0.1.0] - 2026-09-16

### Added

- Initial package: worker + DocuBuilder model for WinCC OA help generation
- CLI `winccoa-docu-builder` with `build` and `register` commands
- Bundled non-runnable sub-project `winccoa/DocuBuilder/scripts/buildHelp.ctl`
- Durable materialize path for CI/Docker (`GITHUB_WORKSPACE/.artifacts/DocuBuilder`)
- Registration helpers `scripts/register-docubuilder-projects.{sh,ps1}`
- Optional `%WINCCOA_VERSION%` substitution in worker advanced doxygen config

---

<center>Made with ❤️ for and by the WinCC OA community</center>
