# upgrade-dependency workflow

*Reference, for anyone running or maintaining the upgrade-dependency workflow.*

| Field | Value |
|---|---|
| File | `workflows/upgrade-dependency.js` |
| Purpose | upgrade one dependency or toolchain (library, engine, compiler, SDK, runner image, CI action) end to end |
| Edits files | Build agent, comparison fix agent and Docs agent only, all on the planned branch |

## Arguments

| Name | Type | Required | Default |
|---|---|---|---|
| `dependency` | string: the dependency or toolchain to upgrade | yes | - |
| `to` | string: exact target version | no | latest stable release upstream |
| `why` | string: reason for the upgrade | no | - |

Missing `dependency` returns a usage string.

## Phases

| Phase | Agents | Writes |
|---|---|---|
| Plan | 1 | nothing |
| Build | 1 | every reference, pins and checksum checks, notices, cache keys, code for breaking changes; cross-role edits only as planned, one commit each |
| Compare | `ab`, `integrity`, `licensing`, `caches`, `ownership`; up to 3 rounds with a fixer | fixer only |
| Docs | 1 | toolchain reference, how-to, explanation |
| Docs check | 1 | nothing |

## What the plan records

| Field | Meaning |
|---|---|
| `current`, `target`, `source` | version now; exact version to move to; upstream page it was read from |
| `references` | every path that names the dependency or its version: build files, lockfiles, bindings, CI files, images, templates, docs |
| `pins` | each download: immutable reference, checksum, and the upstream source of the checksum |
| `breaking` | upstream changes between the versions that touch what the project uses |
| `license` | license before and after, compatibility, notice and credits files to change |
| `caches` | cache keys that must include the new version |
| `ab` | before/after measures: what, how to run it, value now, tolerance |
| `cross_role` | paths owned by another role that must change: owner, minimal edit |
| `rollback` | how to go back to the current version |
| `blockers` | what stops the upgrade; any entry ends the run before Build |

An incompatible license also ends the run before Build.

## Gates

| After | Stops when |
|---|---|
| Plan | `blockers` is not empty, or `license.compatible` is false |
| Build | a checksum is not verified, or the build or tests fail |
| Compare | a check still has blocking findings after 3 rounds |

## Comparison checks

| Check | Blocks on |
|---|---|
| `ab` | a measure outside its tolerance or not measured, with no explanation in the PR |
| `integrity` | a reference still on the old version, an unpinned download, a checksum not verified against upstream or not failing on mismatch |
| `licensing` | a license or notice that does not match the new version |
| `caches` | a cache key without the new version, or an old cache restored |
| `ownership` | a path outside the role's owned paths not listed under "Cross-role edits" with its owner notified |

## Output

| Field | Meaning |
|---|---|
| `decision` | `ready-for-review` or `blocked` |
| `dependency`, `from`, `to` | the upgrade |
| `branch`, `pr` | where the change is |
| `pins`, `breaking`, `license`, `caches`, `cross_role`, `rollback` | from the plan |
| `ab` | before/after table: `measure`, `how`, `before`, `after`, `tolerance` |
| `open` | blocking findings (only when blocked) |
| `doc_problems` | docs check problems |
| `evidence` | per check evidence |
| `next` | land the PR with engineering-practices land-pr after the code reviewer passes it |

## Run modes

Run modes v2. Besides its own args, the workflow takes the optional `run` arg defined in the engineering-practices
[workflow run modes reference](https://github.com/opsroller/engineering-practices/blob/main/docs/reference/workflow-run-modes.md):
`run: { mode: "inline" }` runs every phase in the calling session with no subagents, `run.only` runs chosen phases or steps,
and `run.from` with `run.results` resumes a stopped run. Without `run`, the workflow and its outputs are as above.
See [how to run a workflow inline](https://github.com/opsroller/engineering-practices/blob/main/docs/how-to/how-to-run-a-workflow-inline.md).

Step labels, for `run.only` and `run.results`: `plan`, `build`, `<check>:<round>` (`ab`, `integrity`, `licensing`, `caches`, `ownership`), `fix:<round>`, `docs`, `docs-check`.

Independent steps: `ab:<round>`, `integrity:<round>`, `licensing:<round>`, `caches:<round>`, `ownership:<round>`, `docs-check`. They review work this run produced, so in inline mode send each to a reviewer with no part in the work and name them in `run.reviewers`; a step you answer yourself is reported in `self_reviewed`.

## Related

- [How to upgrade a dependency or toolchain](../how-to/how-to-upgrade-a-dependency-or-toolchain.md)
- [supply-chain-security skill](skill-supply-chain-security.md), [cross-platform-builds skill](skill-cross-platform-builds.md), [license-compliance skill](skill-license-compliance.md)
