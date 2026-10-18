# release-readiness workflow

*Reference, for anyone running or maintaining the release-readiness workflow.*

| Field | Value |
|---|---|
| File | `workflows/release-readiness.js` |
| Purpose | go/no-go for a version before tagging |
| Edits files | only the Docs agent (branch `docs/release-<version>`) |

## Arguments

| Name | Type | Required | Default |
|---|---|---|---|
| `version` | string, SemVer `X.Y.Z[-pre]` (a leading `v` is stripped) | yes | - |
| `platforms` | string[] | no | from project profile |
| `stores` | string[] | no | from project profile |

Missing or invalid `version` returns a usage string.

## Phases

| Phase | Agents | Writes |
|---|---|---|
| Plan | 1 | nothing |
| Check | one per platform, per store, plus `licenses`, `supply-chain`, `changelog` | nothing |
| Docs | 1 | changelog, release notes, planned doc pages |
| Docs check | 1 | nothing |
| Go/no-go | none (computed) | nothing |

## Output

| Field | Meaning |
|---|---|
| `version` | checked version |
| `decision` | `go` or `no-go` |
| `blockers` | `<area>: <problem>` strings, including docs problems |
| `unverified` | areas whose checker returned nothing |
| `owner_actions` | `<area>: <step>` strings only the owner can do |
| `evidence` | per area: status and evidence links |
| `docs_pr` | Docs agent result, or null |
| `next` | next step |

`no-go` whenever any blocker exists, including an unverified area or a docs check that did not run.

## Run modes

Run modes v1. Besides its own args, the workflow takes the optional `run` arg defined in the engineering-practices
[workflow run modes reference](https://github.com/opsroller/engineering-practices/blob/main/docs/reference/workflow-run-modes.md):
`run: { mode: "inline" }` runs every phase in the calling session with no subagents, `run.only` runs chosen phases or steps,
and `run.from` with `run.results` resumes a stopped run. Without `run`, the workflow and its outputs are as above.
See [how to run a workflow inline](https://github.com/opsroller/engineering-practices/blob/main/docs/how-to/how-to-run-a-workflow-inline.md).

Step labels, for `run.only` and `run.results`: `plan`, `build:<platform>` (one per platform), `store:<store>` (one per store), `licenses`, `supply-chain`, `changelog`, `docs`, `docs-check`.
