# Source layout

- `cli.ts` — CLI (`winccoa-docu-builder` build|register)
- `docu-build.ts` — run WCCOActrl with `-config` against worker project
- `register.ts` — DocuBuilder + worker registration (sub-project model)
- `paths.ts` — resolve bundled `winccoa/DocuBuilder`
- `types.ts` — public option/result types

Helpers (repo root `scripts/`):

- `register-docubuilder-projects.sh`
- `register-docubuilder-projects.ps1`

---

<center>Made with ❤️ for and by the WinCC OA community</center>
