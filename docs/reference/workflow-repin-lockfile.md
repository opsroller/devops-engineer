# repin-lockfile workflow

*Reference, for anyone running or maintaining the repin-lockfile workflow.*

| Field | Value |
|---|---|
| File | `workflows/repin-lockfile.js` |
| Purpose | repin one hash-locked lockfile to another interpreter, runtime or platform with every package at the version it has now |
| Edits files | Repin agent and check fix agent only, both on the planned branch |

For a change of any package version, use
[upgrade-dependency](workflow-upgrade-dependency.md) instead; this
workflow stops when a version would have to move.

## Arguments

| Name | Type | Required | Default |
|---|---|---|---|
| `lockfile` | string: path of the lockfile | yes | - |
| `target` | string: interpreter, runtime or platform to lock for | yes | - |
| `keep` | `"yes"`, `"no"` or `"decide"`: keep the old target locked too | no | `"decide"` |
| `why` | string: reason for the repin | no | - |

Missing `lockfile` or `target`, or any other `keep` value, returns a usage string.

## Phases

| Phase | Agents | Writes |
|---|---|---|
| Plan | 1 | nothing |
| Repin | 1 | the regenerated lockfile, the references and docs pages that name the old target; cross-role edits only as planned, one commit each; pushes, opens a draft PR and returns the branch, head SHA, the version diff and the target install result |
| Check | `verify`; up to 2 rounds with a fixer | fixer only |

## What the plan records

| Field | Meaning |
|---|---|
| `tool`, `command` | the tool that generated the lockfile, at its exact version, and the command that regenerates it for the target |
| `current_target` | what the lockfile is locked for now |
| `packages` | how many packages it pins |
| `keep_old`, `keep_reason` | whether the old target stays locked too, and what still uses it |
| `missing` | packages with no distribution for the target at their pinned version |
| `references` | pipeline steps, images, config, cache keys and docs that name the old target and move with the change |
| `verify` | clean install on the target with hash checking enforced, then the step that consumes the lockfile |
| `docs` | pages that name the old target as the one in use |
| `cross_role` | paths owned by another role that must change: owner, minimal edit |
| `blockers` | what stops a same-version repin; any entry, or any `missing` entry, ends the run before Repin |

## Gates

| After | Stops when |
|---|---|
| Plan | `blockers` or `missing` is not empty; `next` points to upgrade-dependency |
| Repin | any package version changed, or the hash-enforced install or consuming step fails on the target |
| Check | `verify` still has blocking findings after 2 rounds |

## The check

`verify` blocks on: a package whose name or version differs from the
default branch; a changed line that is not a hash, a marker or the
generated header; a marker-only package change missing from the PR; a
file that differs from what the planned command regenerates; no passing
hash-enforced install on the target; a reference or docs page still on
the old target (or, when the old target is kept, something that no
longer installs on it); a path outside the role's owned paths not listed
under "Cross-role edits".

## Output

| Field | Meaning |
|---|---|
| `decision` | `ready-for-review` or `blocked` |
| `lockfile`, `from`, `to`, `kept_old` | the repin |
| `packages` | versions held unchanged |
| `marker_changes` | packages added or removed only behind a platform marker |
| `branch`, `pr`, `install_run` | where the change is and the target install run |
| `references`, `cross_role` | from the plan |
| `open` | blocking findings (only when blocked) |
| `evidence` | the check's evidence |
| `handoff` | only on `ready-for-review`: the deliver-package `prior` object |
| `next` | ship with deliver-package for a work package; otherwise land the PR with engineering-practices land-pr after the code reviewer passes it; when blocked on a version change, run upgrade-dependency |

## Handoff

The Repin step commits, pushes and opens the draft PR. On
`ready-for-review`, `handoff` is the object engineering-practices
[deliver-package](https://github.com/opsroller/engineering-practices/blob/main/docs/reference/workflow-deliver-package.md)
takes as `prior`: `from` (`devops-engineer:repin-lockfile`), `branch`,
`pr`, `head_sha`, `tests_pass`, `docs`, `undocumented`, `notes` (the
repin, cross-role edits).

## Run modes

Run modes v2. Besides its own args, the workflow takes the optional `run` arg defined in the engineering-practices
[workflow run modes reference](https://github.com/opsroller/engineering-practices/blob/main/docs/reference/workflow-run-modes.md):
`run: { mode: "inline" }` runs every phase in the calling session with no subagents, `run.only` runs chosen phases or steps,
and `run.from` with `run.results` resumes a stopped run. Without `run`, the workflow and its outputs are as above.
See [how to run a workflow inline](https://github.com/opsroller/engineering-practices/blob/main/docs/how-to/how-to-run-a-workflow-inline.md).

Step labels, for `run.only` and `run.results`: `plan`, `repin`, `verify:<round>`, `fix:<round>`.

Independent steps: `verify:<round>`. It reviews work this run produced, so in inline mode send it to a reviewer with no part in the work and name them in `run.reviewers`; a step you answer yourself is reported in `self_reviewed`.

## Related

- [How to repin a lockfile to another interpreter or platform](../how-to/how-to-repin-a-lockfile-to-another-interpreter-or-platform.md)
- [upgrade-dependency workflow](workflow-upgrade-dependency.md), [supply-chain-security skill](skill-supply-chain-security.md)
