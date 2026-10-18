# add-build-target workflow

*Reference, for anyone running or maintaining the add-build-target workflow.*

| Field | Value |
|---|---|
| File | `workflows/add-build-target.js` |
| Purpose | add one platform build target end to end |
| Edits files | Build agent, verification fix agent and Docs agent only, all on the planned branch |

## Arguments

| Name | Type | Required | Default |
|---|---|---|---|
| `target` | string, e.g. `linux-x86_64` | yes | - |
| `store` | string | no | none |

Missing `target` returns a usage string.

## Phases

| Phase | Agents | Writes |
|---|---|---|
| Plan | 1 | nothing |
| Build | 1 | build script, CI job, a CI step that runs the artifact in its real runtime |
| Verify | `reproducibility`, `runtime`, `matrix`, `compliance`, plus `store` if given; up to 3 rounds with a fixer | fixer only |
| Docs | 1 | build targets reference (a row in the project's targets page, or a new page if it has none), how-to, explanation, store sheet |
| Docs check | 1 | nothing |

## What the plan records

| Field | Meaning |
|---|---|
| `toolchain_pins` | exact versions with checksum sources, taken from the vendor's release build (release notes, published artifacts and checksums), never from the vendor's CI configuration |
| `runtime_check` | `runtime` (headless browser for web, emulator or device for mobile, the OS for desktop), `command` that launches the artifact on committed content in CI, and what it `asserts` (first screen or state reached, no runtime errors in console or log, exit code) |
| `has_sbom` | whether the project produces an SBOM; without one, `compliance` suggests it and does not block |
| `targets_page` | the project's reference page listing build targets, or empty |

## Verification checks

| Check | Blocks on |
|---|---|
| `reproducibility` | digests differ between clean builds, a cold build fails, a cache key misses an input |
| `runtime` | the artifact fails `runtime_check` in its real runtime, or CI does not run that check |
| `matrix` | an existing job changes behaviour, an implicit build option, an unpinned or unverified download |
| `compliance` | no notices bundle, a new file without the project license, an unrecorded or incompatible bundled library; missing SBOM coverage only when the project has an SBOM |

## Output

| Field | Meaning |
|---|---|
| `decision` | `ready-for-review` or `blocked` |
| `target`, `branch` | what and where |
| `open` | verification failures (only when blocked in Verify) |
| `doc_problems` | docs check problems |
| `owner_actions` | owner-only steps |
| `evidence` | per check evidence |

## Run modes

Run modes v2. Besides its own args, the workflow takes the optional `run` arg defined in the engineering-practices
[workflow run modes reference](https://github.com/opsroller/engineering-practices/blob/main/docs/reference/workflow-run-modes.md):
`run: { mode: "inline" }` runs every phase in the calling session with no subagents, `run.only` runs chosen phases or steps,
and `run.from` with `run.results` resumes a stopped run. Without `run`, the workflow and its outputs are as above.
See [how to run a workflow inline](https://github.com/opsroller/engineering-practices/blob/main/docs/how-to/how-to-run-a-workflow-inline.md).

Step labels, for `run.only` and `run.results`: `plan`, `build`, `<check>:<round>` (`reproducibility`, `runtime`, `matrix`, `compliance`, and `store` when a store is given), `fix:<round>`, `docs`, `docs-check`.

Independent steps: `reproducibility:<round>`, `runtime:<round>`, `matrix:<round>`, `compliance:<round>`, `docs-check`. They review work this run produced, so in inline mode send each to a reviewer with no part in the work and name them in `run.reviewers`; a step you answer yourself is reported in `self_reviewed`.
