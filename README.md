# npm-winccoa-docu-builder

Build WinCC OA **project documentation** using `WCCOActrl` and the bundled
non-runnable **DocuBuilder** subproject (`buildHelp.ctl`).

## Correct project model

1. Register **DocuBuilder** as a **non-runnable** WinCC OA project.
2. Register the **worker / source project** (e.g. Squirt) as **runnable**, with
   DocuBuilder attached via `--sub-project DocuBuilder`
   (`@winccoa-tools-pack/npm-winccoa-register-project`).
3. Optionally merge external **projectDocu** asset directories into the worker
   `data/projectDocu` (theme CSS, advanced Doxygen config, extras).
4. Start CTRL against the **worker** config (not `-proj DocuBuilder`):

```text
WCCOActrl -config <worker>/config/config -n -log +stderr buildHelp.ctl <CompanyName>
```

Why this is correct:

- The worker project owns logs and help output (not DocuBuilder).
- `getPath` / script resolution uses DocuBuilder as a sub-project.
- Docs assets can live outside the productive tree (e.g. `.winccoa-docu-builder/`,
  `.doxygen-awesome-css/`) and still be discovered by OA next to advanced config.
- v1 builds docs from the **runner/worker project only** (tests later).

## Install

```bash
npm install @winccoa-tools-pack/npm-winccoa-docu-builder
```

## CLI

```bash
# Register only (DocuBuilder + worker with sub-project)
winccoa-docu-builder register ./src/Squirt -v 3.21

# Build docs (registers first by default)
winccoa-docu-builder build ./src/Squirt -v 3.21 -c "winccoa-tools-pack"

# Layer external projectDocu sources (repeatable; left → right)
winccoa-docu-builder build ./src/Squirt -v 3.21 \
  --project-docu ./.doxygen-awesome-css \
  --project-docu ./.winccoa-docu-builder
```

### projectDocu merge rules

Sources are copied into `{worker}/data/projectDocu` before the build:

| File | Policy |
| --- | --- |
| `advanced_doxygenConfig.txt` | Concatenate in path order (later Doxygen keys win) |
| Other top-level files (`extra_*.html`, `extra_stylesheet.css`, …) | Last path wins |

## Local registration helpers

Shell (Linux / Git Bash / CI):

```bash
./scripts/register-docubuilder-projects.sh \
  --project-path ./src/Squirt \
  --version 3.21 \
  --langs en_US.utf8
```

PowerShell (Windows local):

```powershell
./scripts/register-docubuilder-projects.ps1 `
  -ProjectPath ./src/Squirt `
  -Version 3.21
```

## API

```ts
import {
  buildDocs,
  mergeProjectDocuSources,
  registerWorkerProjectWithDocuBuilder,
} from '@winccoa-tools-pack/npm-winccoa-docu-builder';

await registerWorkerProjectWithDocuBuilder({
  projectPath: './src/Squirt',
  version: '3.21',
});

const result = await buildDocs({
  projectPath: './src/Squirt',
  version: '3.21',
  companyName: 'winccoa-tools-pack',
  registerProject: false,
  projectDocuPaths: [
    './.doxygen-awesome-css',
    './.winccoa-docu-builder',
  ],
});
```

## DocuBuilder layout

```text
winccoa/DocuBuilder/
  scripts/buildHelp.ctl
```

DocuBuilder is **non-runnable**. It has no `config/` or `log/`. The worker
project owns `config/config`, logs, and help when CTRL runs with `-config`.

## GitHub Action

Use
[`winccoa-tools-pack/github-actions-winccoa/actions/winccoa-docu-builder`](https://github.com/winccoa-tools-pack/github-actions-winccoa/tree/main/actions/winccoa-docu-builder)
to run this package in CI with warning extraction and PR annotations.
Pass multi-line `project-docu-paths` to layer external asset directories.

## Development

```bash
npm ci
npm run build
npm run test:unit
```

---

<center>Made with ❤️ for and by the WinCC OA community</center>
