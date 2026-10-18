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
| Build | 1 | build script, CI job |
| Verify | `reproducibility`, `matrix`, `compliance`, plus `store` if given; up to 3 rounds with a fixer | fixer only |
| Docs | 1 | build targets reference, how-to, explanation, store sheet |
| Docs check | 1 | nothing |

## Output

| Field | Meaning |
|---|---|
| `decision` | `ready-for-review` or `blocked` |
| `target`, `branch` | what and where |
| `open` | verification failures (only when blocked in Verify) |
| `doc_problems` | docs check problems |
| `owner_actions` | owner-only steps |
| `evidence` | per check evidence |
