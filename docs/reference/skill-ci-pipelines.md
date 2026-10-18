# ci-pipelines skill

*Reference, for anyone looking up what the ci-pipelines skill covers.*

| Field | Value |
|---|---|
| File | `skills/ci-pipelines/SKILL.md` |
| Used when | designing, changing, speeding up or debugging a CI/CD pipeline |
| Produces | pipeline definitions, required checks, pipeline reference docs |

## Pipeline stages

| Stage | Trigger | Target time | Contents |
|---|---|---|---|
| Commit | PR push | <= 10 min | lint, primary-target compile, unit tests, license check, secret scan, dependency diff |
| Integration | merge to default branch | <= 30-45 min | full matrix, system tests on packages, SBOM, provenance |
| Release | version tag | - | promote, sign, publish |
| Scheduled | nightly/weekly | - | updates, soak tests, posture check |

## Rules

- Fast, likely-to-fail checks first.
- Build once; release promotes the same bytes by digest.
- System tests run on the packaged artifact.
- Every check that matters is required.
- Pipelines are code in the repository.
- Every job passes its build options explicitly; a new default-on option must not break other jobs.
- Every downloaded tool, SDK, engine or runtime is version-pinned and checksum-verified.
- Third-party steps pinned to immutable references; tokens read-only by default.
- Untrusted PR code never runs with secrets; untrusted text never interpolated into shell.
- Artifact retention set explicitly, shortest that serves; on public repositories logs, caches and artifacts are readable by anyone with read access.
- A path-filtered or event-limited check is never required where it does not report.
- Edits to another role's paths are minimal, separate commits, listed in the PR, owner told.

## Workflow

[change-pipeline](workflow-change-pipeline.md) runs the method for adding or changing a stage.

## Quality bar

PR feedback median <= 10 min; default branch red < 1 h per week; flake rate tracked; every artifact traceable to commit, run and digest.

## Docs owed

Reference for stages, checks, artifacts; how-to for new contributor procedures; explanation for pipeline design choices.
