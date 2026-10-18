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
