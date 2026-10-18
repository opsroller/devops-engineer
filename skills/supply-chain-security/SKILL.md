---
name: supply-chain-security
description: Use when adding or updating a dependency, toolchain or third-party pipeline step, generating an SBOM, producing or verifying build provenance and signatures, handling pipeline secrets, or assessing the project's security posture against SLSA or OpenSSF Scorecard.
---

# Supply-chain security

Protect users from tampered or vulnerable artifacts by controlling what
goes into a build, how the build runs, and proving what came out. Grounded
in SLSA (Build track levels 1-3), the OpenSSF Scorecard checks, and the
CISA/NTIA SBOM minimum elements. Tools are examples only (e.g. Syft,
cdxgen, Sigstore/cosign, OSV-Scanner, Dependabot, Renovate).

## Targets for a typical project

| Area | Minimum | Goal |
|---|---|---|
| Dependencies | lockfile committed; versions pinned | hashes in lockfile; automated update PRs; known-vulnerability scan blocks release |
| Pipeline steps | third-party steps pinned to commit SHA/digest | update tool keeps pins fresh |
| Toolchains and downloads | exact versions | checksum or signature verified before use |
| Tokens | read-only default, write per job | short-lived federated credentials for publishing |
| Build | hosted CI, from a clean checkout (SLSA Build L2 platform) | isolated, ephemeral builders with signing keys out of reach of build steps (L3) |
| Provenance | generated per release (L1) | signed by the build platform and verified before publish (L2/L3) |
| SBOM | one per release artifact | complete transitive coverage, attached to the release, signed |
| Releases | checksums published | artifacts signed; signatures verifiable by users |
| Repo | branch protection, review required | security policy, Scorecard run on schedule |

## Method: adding or updating a dependency

1. Need: is it worth a new dependency? Prefer the standard library or an
   existing dependency.
2. Health: maintained (recent releases, responsive issues), adoption,
   security policy, known vulnerabilities (OSV or the ecosystem advisory
   database), Scorecard result if available.
3. License: run `license-compliance` before adding; unknown or incompatible
   blocks the change.
4. Pin: exact version in the lockfile with integrity hashes; vendor or
   mirror only if the project profile says so.
5. Review the diff of what actually changes in the lockfile (transitive
   additions included).
6. Record: the dependency appears in the next SBOM automatically; note any
   manual license/notice entry needed.

Automated update PRs: group minor/patch updates, run the full pipeline,
merge when green; major updates get a human read of the changelog.

## Method: SBOM per release

1. Generate from the **built artifact** (and, where useful, from the
   source lockfiles), in SPDX or CycloneDX.
2. Include the CISA minimum elements: SBOM author, tool name/version,
   timestamp, format version; per component: name, version, producer,
   unique identifier (PURL or CPE), hash, license (SPDX identifier),
   dependency relationships, with transitive coverage. Mark unknowns as
   unknown, not omitted.
3. Attach to the release next to the artifact; sign it with the artifacts.
4. Scan it for known vulnerabilities; a critical or high unfixed issue
   reachable in the product blocks release unless the owner accepts it in
   writing.

## Method: provenance and signing

1. Generate provenance in the build platform's trusted control plane (not
   by a user-controlled script) describing: source repo and commit, build
   entry point and parameters, builder identity, output digests.
2. Sign provenance and artifacts with keys the build steps cannot read
   (keyless/OIDC signing or the platform's attestation service).
3. Before publishing, **verify** provenance: expected repo, expected
   branch/tag, expected builder, digest matches. Publish only on success.
4. Publish verification instructions for users in the project's how-to
   docs.

## Secrets

- Only in the CI secret store, scoped to the job/environment; never in the
  repository, logs, artifacts or caches.
- Secret scanning on every PR and on the full history once; a found secret
  is rotated first, then removed.
- Untrusted PR code never runs with secrets (see `ci-pipelines`).

## Scorecard-style posture review

Run on a schedule and before major releases; checklist in
[posture-checklist.md](posture-checklist.md). Treat Critical and High
findings (dangerous workflow patterns, token permissions, branch
protection, code review, signed releases, unfixed vulnerabilities, binary
artifacts in the repo) as work items with owners.

## Quality bar

- No unpinned third-party pipeline step; no unverified download.
- Every release has an SBOM, signed provenance and signed artifacts, and
  the publish step verifies provenance first.
- Known-vulnerability scan runs on every release; exceptions are written.

## Failure modes

- Pinning a mutable tag (`v3`, `latest`) and calling it pinned.
- SBOM generated from the source tree only, missing bundled/vendored code.
- Provenance produced by a script any PR can edit (forgeable).
- Signing key readable by build steps or stored as a long-lived secret.
- Update PRs left unmerged for months, so pins rot and then jump.
- Committed binaries nobody can rebuild.

## Documentation this work owes (Diataxis)

- New dependency policy or SBOM/provenance format -> **reference**.
- Users or contributors must act -> **how-to** ("How to verify a release
  signature", "How to add a dependency").
- Security posture decision (target SLSA level, what is accepted) ->
  **explanation**.
