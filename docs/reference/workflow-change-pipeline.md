# change-pipeline workflow

*Reference, for anyone running or maintaining the change-pipeline workflow.*

| Field | Value |
|---|---|
| File | `workflows/change-pipeline.js` |
| Purpose | add or change one CI/CD stage or check end to end |
| Edits files | Build agent, verification fix agent and Docs agent only, all on the planned branch |

## Arguments

| Name | Type | Required | Default |
|---|---|---|---|
| `change` | string: the stage or check to add or change, and why | yes | - |
| `required` | `yes`, `no` or `decide` | no | `decide` |

Missing `change`, or any other `required` value, returns a usage string.

## Phases

| Phase | Agents | Writes |
|---|---|---|
| Plan | 1 | nothing |
| Build | 1 | pipeline files; cross-role edits only as planned, one commit each |
| Verify | `behaviour`, `security`, `timing`, `ownership`; up to 3 rounds with a fixer | fixer only |
| Required check | 1 | nothing |
| Docs | 1 | pipeline reference, how-to, explanation |
| Docs check | 1 | nothing |

## What the plan records

| Field | Meaning |
|---|---|
| `purpose`, `failure_meaning` | what the stage is for; "red means X; to fix, do Y" |
| `local_command` | one command that reproduces the check locally |
| `scope` | pipeline files, triggers, path filters, existing jobs affected |
| `pins` | every runner image, toolchain and third-party step, by immutable reference |
| `permissions`, `secrets` | token scopes per job (read-only by default); each secret and its one job |
| `artifacts` | name, retention, visibility and contents of each upload |
| `repo_public` | whether anyone with read access can see logs, caches and artifacts |
| `baseline`, `budget` | recent durations of the affected pipelines; time the stage may add |
| `cross_role` | paths owned by another role that must change: owner, minimal edit, why |
| `rollback` | how to undo the change |

## Verification checks

| Check | Blocks on |
|---|---|
| `behaviour` | no red run for a known-bad input, unclear failure message, changed behaviour of an existing job, triggers or paths not as planned |
| `security` | write scopes without reason, unpinned step or unverified download, untrusted input in shell, secrets on untrusted triggers, artifacts or logs exposing what they should not |
| `timing` | stage over its budget on the PR path; incorrect cache key |
| `ownership` | a path outside the role's owned paths that is not listed under "Cross-role edits" with its owner notified |

## Output

| Field | Meaning |
|---|---|
| `decision` | `ready-for-review` or `blocked` |
| `branch`, `pr` | where the change is |
| `failure_meaning` | what red means for the new stage |
| `baseline`, `timings` | before and after durations |
| `required_check` | `decision` (`required-now`, `required-after-green-runs`, `not-required`), `green_runs_needed`, `reason` |
| `cross_role` | cross-role edits made |
| `open` | verification failures (only when blocked in Verify) |
| `doc_problems` | docs check problems |
| `owner_actions` | owner-only steps, such as a branch protection setting |
| `evidence` | per check evidence |

## Run modes

Run modes v1. Besides its own args, the workflow takes the optional `run` arg defined in the engineering-practices
[workflow run modes reference](https://github.com/opsroller/engineering-practices/blob/main/docs/reference/workflow-run-modes.md):
`run: { mode: "inline" }` runs every phase in the calling session with no subagents, `run.only` runs chosen phases or steps,
and `run.from` with `run.results` resumes a stopped run. Without `run`, the workflow and its outputs are as above.
See [how to run a workflow inline](https://github.com/opsroller/engineering-practices/blob/main/docs/how-to/how-to-run-a-workflow-inline.md).

Step labels, for `run.only` and `run.results`: `plan`, `build`, `<check>:<round>` (`behaviour`, `security`, `timing`, `ownership`), `fix:<round>`, `gate`, `docs`, `docs-check`.
