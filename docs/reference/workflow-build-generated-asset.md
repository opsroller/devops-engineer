# build-generated-asset workflow

*Reference, for anyone running or maintaining the build-generated-asset workflow.*

| Field | Value |
|---|---|
| File | `workflows/build-generated-asset.js` |
| Purpose | make a generated asset (anything a script produces from tracked inputs) a build output instead of a committed file |
| Edits files | Build agent, verification fix agent and Docs agent only, all on the planned branch |

## Arguments

| Name | Type | Required | Default |
|---|---|---|---|
| `asset` | string: what is generated, by which generator, and why it should be built rather than committed | yes | - |

Missing `asset` returns a usage string.

## Phases

| Phase | Agents | Writes |
|---|---|---|
| Plan | 1 | nothing; stops with `blocked` if the generator cannot run in CI or the project requires committed outputs |
| Build | 1 | build target, reusable CI step, consumer wiring, ignore rule, untracked outputs; cross-role edits only as planned, one commit each; pushes, opens a draft PR, lets CI run (cold) and re-runs the same workflow once (warm), and returns both run links, the branch, head SHA and whether the checks pass |
| Verify | `clean`, `cache`, `determinism`, `wiring`, `security`, `ownership`; up to 3 rounds with a fixer | fixer only |
| Docs | 1 | build reference, regenerate-locally how-to, explanation; runs the project's docs check on the pushed head if it has one |
| Docs check | 1 | nothing |

## What the plan records

| Field | Meaning |
|---|---|
| `generator` | command, script path, owning role, tools with versions |
| `inputs`, `outputs` | every tracked file the generator reads; every file it writes, at the path consumers expect |
| `committed_outputs` | outputs tracked today, removed from version control (inputs stay tracked) |
| `consumers` | every CI job, build step, import step or script that reads the outputs |
| `build_target` | build-system rule with declared inputs and outputs (for example CMake `add_custom_command` with `OUTPUT` and `DEPENDS` plus a target consumers depend on), and the local regenerate command |
| `ci_step` | one reusable step (composite action, reusable workflow or template) that sets up pinned tools, restores the cache, runs the target on a miss and saves the cache; the jobs that call it |
| `hash_inputs` | what the cache key hashes: generator, inputs, tool versions or lockfile, runner OS where output depends on it, a key version prefix |
| `cache` | key, restore paths, which scope may write it, whether release builds use it |
| `deterministic` | whether two runs give identical bytes; the cause and fix if not |
| `pins`, `permissions`, `repo_public` | as in [change-pipeline](workflow-change-pipeline.md) |
| `baseline`, `budget` | recent pipeline durations; time the step may add on a hit and on a miss |
| `cross_role` | paths owned by another role (often the generator or its inputs): owner, minimal edit, why |
| `rollback`, `owner_actions`, `blockers` | how to go back to committed outputs; owner-only steps; what prevents the move |

## Verification checks

| Check | Blocks on |
|---|---|
| `clean` | a fresh clone with no cache does not produce every output, or something that reads them fails; an input change does not rerun the generator, or an unchanged rebuild does; outputs still tracked, not ignored, or inputs untracked |
| `cache` | reads the Build step's cold and warm runs (never triggers one): either missing, no miss on the cold run or no hit on the warm one; step over budget; a key that misses any `hash_inputs` item or changes every run; partial restore-key fallback for the outputs; a scope other than the planned one can write the cache |
| `determinism` | output digests differ between two runs on the same inputs, other than as the plan states |
| `wiring` | a job or step reads the outputs without the CI step or build target first; a package or export lacks them; a consumer the plan missed |
| `security` | write scopes without reason, unpinned tool or unverified download, untrusted input in shell, an untrusted branch able to write a cache the default branch or a release reads |
| `ownership` | a path outside the role's owned paths that is not listed under "Cross-role edits" with its owner notified |

## Output

| Field | Meaning |
|---|---|
| `decision` | `ready-for-review` or `blocked` |
| `branch`, `pr` | where the change is |
| `outputs`, `untracked` | generated files; those removed from version control |
| `build_target`, `ci_step`, `cache` | as planned |
| `baseline`, `timings` | before and after durations |
| `cross_role` | cross-role edits made |
| `open` | plan blockers, verification failures, or the handoff problem (no branch, or checks not green) |
| `doc_problems` | docs check problems |
| `owner_actions` | owner-only steps |
| `evidence` | per check evidence |
| `handoff` | only on `ready-for-review`: the deliver-package `prior` object |
| `next` | only on `ready-for-review`: ship with deliver-package for a work package, otherwise land-pr |

## Handoff

As in [change-pipeline](workflow-change-pipeline.md#handoff): the Build
step commits, pushes and opens the draft PR, so `handoff` is the object
engineering-practices
[deliver-package](https://github.com/opsroller/engineering-practices/blob/main/docs/reference/workflow-deliver-package.md)
takes as `prior`: `from` (`devops-engineer:build-generated-asset`),
`branch`, `pr`, `head_sha`, `tests_pass`, `docs`, `undocumented`,
`notes` (outputs no longer committed, cache scope, cross-role edits,
owner actions). Pass the whole result and the work ships without being
built again. With no work package, land the branch with land-pr.

## Run modes

Run modes v2. Besides its own args, the workflow takes the optional `run` arg defined in the engineering-practices
[workflow run modes reference](https://github.com/opsroller/engineering-practices/blob/main/docs/reference/workflow-run-modes.md):
`run: { mode: "inline" }` runs every phase in the calling session with no subagents, `run.only` runs chosen phases or steps,
and `run.from` with `run.results` resumes a stopped run. Without `run`, the workflow and its outputs are as above.
See [how to run a workflow inline](https://github.com/opsroller/engineering-practices/blob/main/docs/how-to/how-to-run-a-workflow-inline.md).

Step labels, for `run.only` and `run.results`: `plan`, `build`, `<check>:<round>` (`clean`, `cache`, `determinism`, `wiring`, `security`, `ownership`), `fix:<round>`, `docs`, `docs-check`.

Independent steps: every `<check>:<round>` and `docs-check`. They review work this run produced, so in inline mode send each to a reviewer with no part in the work and name them in `run.reviewers`; a step you answer yourself is reported in `self_reviewed`.
