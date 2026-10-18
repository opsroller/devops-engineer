---
name: release-management
description: Use when cutting a release, deciding a version number, generating a changelog or release notes, choosing or running a branching model, shipping a hotfix, or rolling a bad release back or forward.
---

# Release management

A release is an immutable, versioned, traceable set of artifacts built by
CI from one commit, with notes that tell users what changed. Grounded in
Semantic Versioning 2.0.0, Conventional Commits, the SRE book's release
engineering chapter (release branches, cherry-picks, change reports),
trunk-based development and SFIA's release management skill (RELM).

## Versioning (SemVer 2.0.0)

- Declare the **public API** first: what users depend on (a library API, a
  CLI, a save-file or config format, a network protocol, plugin hooks).
  SemVer is meaningless without it; write it in the project's reference docs.
- `MAJOR` = incompatible change to that API; `MINOR` = backward-compatible
  feature or a deprecation; `PATCH` = backward-compatible fix. Reset the
  lower numbers on each bump.
- `0.y.z` = initial development; anything may change. Ship `1.0.0` when the
  public API is meant to be stable.
- Pre-releases: `1.4.0-rc.1`, `1.4.0-beta.2` (lower precedence than
  `1.4.0`). Build metadata `+<sha>` is ignored for precedence.
- **A released version never changes.** Any fix is a new version. An
  accidental breaking change in a minor release is fixed by a new release
  that restores compatibility, and the bad version is documented.
- Deprecate in a minor release, keep it for at least one minor release, then
  remove in a major.
- Products whose store requires a monotonically increasing build number
  (e.g. mobile stores) derive it deterministically from the version or the
  CI run number; record the mapping.

## From commits to version

With Conventional Commits on the default branch:

| Commits since last tag contain | Bump |
|---|---|
| `BREAKING CHANGE:` footer or `!` after type | major (minor while in 0.y.z, if the project says so) |
| `feat` | minor |
| `fix`, `perf` | patch |
| only `docs`, `chore`, `ci`, `test`, `refactor`, `build` | no release, or patch if the project ships on every merge |

A release tool can compute this (e.g. semantic-release, release-please,
git-cliff); the rules above are the contract, the tool is the project's
choice.

## Branching model (choose one, record why)

- **Trunk-based, release from main** (default for continuous delivery):
  short-lived branches, merge to main behind feature flags, tag main.
- **Release branches** (when a release must be stabilized or supported
  while main moves on): cut `release/X.Y` from a green main commit; fixes
  land on main first, then are **cherry-picked** to the release branch;
  release branches are never merged back. This keeps each release's exact
  contents known.
- Long-lived feature branches and "develop" integration branches slow
  integration and are a DORA anti-pattern; avoid unless the project requires
  them.

## Method: cutting a release

1. Confirm readiness: default branch green on the full matrix; open blockers
   triaged (run the `release-readiness` workflow for anything non-trivial).
2. Compute the version from commits; check it against the public API
   (a "fix" that changes a file format is a breaking change).
3. Generate the changelog from commits (`CHANGELOG.md`, Keep a Changelog
   style: Added, Changed, Deprecated, Removed, Fixed, Security), then edit
   user-facing release notes in plain language: what changed for the user,
   known issues, upgrade steps.
4. Tag the commit (`vX.Y.Z`, annotated, signed where the project supports
   it). The tag triggers the release stage.
5. The release stage **promotes** the integration artifacts (no rebuild),
   signs them, attaches checksums, SBOM, provenance, license notices and the
   source archive (see `supply-chain-security`, `license-compliance`).
6. Publish: release page, package registries, then stores via
   `store-distribution`, using staged rollouts where available.
7. Hand off: artifact URLs, checksums, store links and notes to the
   frontend-web-developer for the download page; status to the
   project-manager.
8. Watch release health (crash rate, error rate, store reviews) for the
   agreed window; decide continue, pause, roll back or roll forward.

## Hotfixes and rollback

- Fix on main, cherry-pick to the release branch (or tag main if
  trunk-based), release `X.Y.(Z+1)`. Never retag.
- **Roll back** when the previous version is safe to restore (no data
  migration); **roll forward** when rollback is impossible (stores rarely
  allow downgrades; data formats changed). Decide which applies before the
  release, not during the incident.
- Every rollback is followed by a blameless review and a test or gate that
  would have caught it.

## Quality bar

- Each release has: SemVer tag on a fully green commit, changelog entry,
  release notes, checksums, SBOM, provenance, notices, source archive.
- Anyone can answer "what exactly is in vX.Y.Z?" from the tag and change
  report in under five minutes.
- Hotfix lead time (fix merged to release published) is measured.

## Failure modes

- Version chosen by mood, not by the public API.
- Changelog written from memory; release notes that are just commit subjects.
- Rebuilding on the tag instead of promoting tested artifacts.
- Moving or deleting a published tag "to fix" a release.
- Fixes made only on the release branch and lost on main.
- No rollback plan for an irreversible data change.

## Documentation this work owes (Diataxis)

- Every release -> **reference**: `CHANGELOG.md` entry (generated) and
  the release notes.
- New public API or format version -> **reference** update and, if users
  must act, a **how-to** ("How to upgrade from 1.x to 2.0").
- New or changed release procedure -> **how-to** ("How to cut a release",
  "How to ship a hotfix").
- Branching or versioning decision -> **explanation** ("About our release
  model").
