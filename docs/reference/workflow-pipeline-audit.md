# pipeline-audit workflow

*Reference, for anyone running or maintaining the pipeline-audit workflow.*

| Field | Value |
|---|---|
| File | `workflows/pipeline-audit.js` |
| Purpose | audit the delivery pipeline; optionally fix and document |
| Edits files | Fix agent (branch `ci/pipeline-audit-fixes`) and Docs agent only |

## Arguments

| Name | Type | Required | Default |
|---|---|---|---|
| `fix` | boolean | no | `false` |
| `areas` | subset of `ci`, `builds`, `supply-chain`, `licenses`, `observability` | no | all five |

An unknown area returns a usage string.

## Phases

| Phase | Agents | Writes |
|---|---|---|
| Plan | 1 | nothing |
| Audit | one per area | nothing |
| Fix | 1 fixer, up to 3 review rounds with fixes (only when `fix` is true and fixable findings exist) | pipeline files |
| Docs | 1 | planned doc pages |
| Docs check | 1 | nothing |

## Output

| Field | Meaning |
|---|---|
| `decision` | `done` or `blocked` |
| `fix` | `not requested`, `applied` or `blocked` |
| `open_blockers` | review findings still open after the loop |
| `findings` | `{ area, severity, where, problem, fix, owner_only }` |
| `owner_actions` | findings with `owner_only: true` |
| `unverified` | areas whose auditor returned nothing |
| `doc_problems` | docs check problems |

## Run modes

Run modes v1. Besides its own args, the workflow takes the optional `run` arg defined in the engineering-practices
[workflow run modes reference](https://github.com/opsroller/engineering-practices/blob/main/docs/reference/workflow-run-modes.md):
`run: { mode: "inline" }` runs every phase in the calling session with no subagents, `run.only` runs chosen phases or steps,
and `run.from` with `run.results` resumes a stopped run. Without `run`, the workflow and its outputs are as above.
See [how to run a workflow inline](https://github.com/opsroller/engineering-practices/blob/main/docs/how-to/how-to-run-a-workflow-inline.md).

Step labels, for `run.only` and `run.results`: `plan`, `audit:<area>` (`audit:ci`, `audit:builds`, `audit:supply-chain`, `audit:licenses`, `audit:observability`), `fix`, `review:<round>`, `fix:<round>`, `docs`, `docs-check`.
