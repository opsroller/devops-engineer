---
name: ci-pipelines
description: Use when designing, changing, speeding up or debugging a CI/CD pipeline - adding a stage or check, splitting PR and default-branch pipelines, fixing a red or flaky build, wiring artifact promotion, or hardening pipeline permissions and triggers.
---

# CI/CD pipelines

A pipeline is the only route from a commit to a release. Its job is to give
fast, trustworthy feedback and to produce the artifacts that ship. Methods
here follow Continuous Delivery (Humble and Farley), the Google SRE book's
release engineering chapter and the DORA research; tools are examples only
(e.g. GitHub Actions, GitLab CI, Jenkins, Buildkite, TeamCity).

## Pipeline shape

| Stage | Runs on | Target time | Contents |
|---|---|---|---|
| Commit (PR) | every push to a PR | <= 10 min | lint/format, compile on the primary target, unit tests, license check, secret scan, dependency diff |
| Integration | merge to default branch | <= 30-45 min | full platform matrix, integration and system tests on packaged artifacts, SBOM, provenance |
| Release | version tag | as needed | promote the already-built artifacts, sign, publish, attach notes |
| Scheduled | nightly / weekly | n/a | dependency updates, long or soak tests, Scorecard-style posture check, cache warm-up |

Decision rules:
- **Fast and likely-to-fail checks first.** Order by (failure probability /
  cost). A formatting error should never wait behind a 20-minute build.
- **Build once, promote the same bytes.** The release stage must not
  rebuild; it promotes artifacts identified by digest from the integration
  run. If you need a rebuild to release, the pipeline is wrong.
- **Test the package, not the tree.** System tests run against the artifact
  that would ship.
- **Every check that matters is required.** A check that can be ignored will
  be. Make it a required status check or delete it.
- **Pipeline as code.** Pipeline definitions live in the repository, are
  reviewed like code, and are versioned with the revision they build.
- **Explicit build options per job.** Every job passes the build options it
  needs (target, arch, build type, feature switches) explicitly; no job
  relies on a default it did not set. Adding a new option that is on by
  default must not break any other job: run the whole matrix before merging,
  and set the option explicitly off in jobs that cannot support it.
- **Verify what you download.** Every tool, SDK, engine or runtime fetched
  by the pipeline is pinned to an exact version and its checksum (or
  signature) is verified before use; a mismatch fails the job.

## Method: adding or changing a stage

1. Read the project profile: CI provider, targets, required checks, runner
   types, secrets available.
2. Write down the stage's purpose, inputs, outputs and its failure meaning
   ("red means X; to fix, do Y").
3. Pin everything it uses: runner image, toolchain version, every
   third-party step by immutable reference (commit SHA or digest), not a
   moving tag. See `supply-chain-security`.
4. Set least-privilege permissions at the top (read-only), then grant write
   scopes only to the job that needs them (e.g. the publish job).
5. Add caching only with a correct key (see `cross-platform-builds`).
6. Run it on a branch; compare duration and result against the baseline.
7. Make it required once it has been green for several runs.
8. Update the project's pipeline reference doc (stages, triggers, required
   checks, artifacts) and, if the stage changes a contributor procedure,
   the relevant how-to.

## Keeping the default branch green

- **Stop the line.** A red default branch blocks merges; the person whose
  change broke it fixes forward within minutes or reverts. Reverting is not
  failure.
- **Flaky tests.** Detect (same commit, different result), quarantine into a
  non-blocking job with a tracked issue and an owner, fix or delete within an
  agreed window. Never auto-retry silently: record each retry as a flake.
- **Bisect, do not guess.** For a regression of unknown origin, bisect over
  the commit range using the CI's own build.

## Pipeline security (triggers and secrets)

- Pull requests from forks or untrusted branches run without secrets and
  with a read-only token. Never check out untrusted PR code in a job that
  has secrets or write permissions.
- Never interpolate untrusted input (PR titles, branch names, issue text)
  directly into shell commands; pass it via environment variables.
- Secrets are scoped to the environment/job that needs them, masked in logs,
  and rotated when someone with access leaves or a leak is suspected.
- Prefer short-lived, federated credentials (OIDC-style workload identity)
  over long-lived tokens for publishing.
- Protect the default branch and release tags: required reviews, required
  checks, no force-push, no deletion.

## Quality bar

- PR feedback median <= 10 minutes; default branch red < 1 hour in total per
  week; flake rate tracked and trending down (`pipeline-observability`).
- A newcomer can find, from the pipeline reference doc, what each check does
  and how to reproduce it locally with one command.
- Every artifact is traceable to a commit, a pipeline run and a digest.

## Failure modes

- One giant job: slow, impossible to cache or parallelize; split by stage.
- "Works in CI only": CI uses setup a developer cannot reproduce; give every
  check a documented local command.
- Release builds on a laptop: unreproducible and unauditable; releases come
  only from CI.
- Unpinned actions/plugins and `latest` images: silent breakage and a
  supply-chain hole.
- Retry-until-green: hides real races and flaky infrastructure.
- Over-broad tokens: a compromised step can push code or publish releases.

## Documentation this work owes (Diataxis)

Classify each change with the compass and update the project's docs in the
same PR:
- New or changed stage, check or artifact -> **reference** (pipeline
  stages, triggers, required checks, artifacts, retention).
- Contributors must do something new -> **how-to** ("How to reproduce a CI
  failure locally", "How to quarantine a flaky test").
- A design choice between alternatives (build once, gate order, runner
  choice) -> **explanation** ("About the delivery pipeline").
- Bug fix to the pipeline -> update reference if behaviour changed; a
  troubleshooting how-to if contributors hit it.
