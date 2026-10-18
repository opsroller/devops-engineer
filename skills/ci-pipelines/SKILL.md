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

The `change-pipeline` workflow runs these steps with independent
verification (`/devops-engineer:change-pipeline`).

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
6. Set each artifact's retention explicitly, to the shortest period that
   serves its use, and upload only what the stage needs. On a public
   repository, logs, caches and artifacts can be read by anyone with read
   access: keep secrets, signing material and builds the project has not
   cleared for release out of them.
7. If the stage needs a change in a path another role owns, keep that
   edit minimal, in its own commit, list it in the PR and tell the owner
   (engineering-practices `peer-coordination`, cross-role edits).
8. Run it on a branch; compare duration and result against the baseline
   and the stage's time budget.
9. Make it required once it has been green for several runs. A check
   that runs only on some paths or events must not be required where it
   never reports, or it blocks unrelated changes.
10. Update the project's pipeline reference doc (stages, triggers, required
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
- **CI-only failures get a local reproduction.** When a job fails only on
  the runner, reproduce the runner's environment locally (its driver or
  runtime versions, or its container image) rather than pushing guesses;
  see "Reproducing a CI-only driver or runtime failure" below.

## Reproducing a CI-only driver or runtime failure

A job that fails only on the runner (hang, crash, wrong pixels) in
rendering, graphics or GPU-compute code is usually the runner's userspace
driver (e.g. a software rasterizer at a version no developer has), not
the code. Reproduce it locally before fixing; the full recipe is the
how-to "How to reproduce a CI-only GPU driver failure locally"
(`docs/how-to/how-to-reproduce-a-ci-only-gpu-driver-failure-locally.md`).

1. Read the runner image and version, the exact driver package versions
   and the program's renderer/device line from the failing job's log;
   if the job does not print them, add a step that does and re-run once.
2. Download exactly those packages (the distribution's package tool, or
   its package archive or snapshot service for versions that left the
   mirror; verify checksums) and unpack them into a scratch directory
   without installing (e.g. `dpkg-deb -x`).
3. Point the loader at them: library path (`LD_LIBRARY_PATH`), OpenGL
   DRI driver path (`LIBGL_DRIVERS_PATH`), Vulkan ICD manifest
   (`VK_DRIVER_FILES`, older loaders `VK_ICD_FILENAMES`, rewriting an
   absolute `library_path`), and the job's own driver selection variables
   (e.g. `LIBGL_ALWAYS_SOFTWARE`, `GALLIUM_DRIVER`,
   `MESA_LOADER_DRIVER_OVERRIDE`).
4. Prove the driver loaded (`glxinfo -B`, `vulkaninfo --summary`, the
   program's renderer line, `LD_DEBUG=libs`) and that it matches the CI
   log exactly. A mismatch makes every later result meaningless.
5. Match the display (the same virtual X server size and depth, or the
   same headless flag) and run the job's exact command on the CI-built
   artifact with the job's timeout.
6. Same symptom = a local red case. Green = the driver is not the whole
   cause: run the job in the runner's container image with the runner's
   CPU and memory limits. A remote debug shell on the runner is the last
   resort: branch only, pinned, never in a job with secrets.
7. If one driver version passes and another fails, bisect between them
   and report the first bad version upstream; pin or work around
   meanwhile.

A local red run proves the failure lives in the program's interaction
with that driver version and gives a fast fix loop; the green case is
still the CI run on the fix branch.

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
