# cross-platform-builds skill

*Reference, for anyone looking up what the cross-platform-builds skill covers.*

| Field | Value |
|---|---|
| File | `skills/cross-platform-builds/SKILL.md` |
| Used when | adding or fixing a build target, making builds reproducible, pinning toolchains, designing caches |
| Produces | build scripts, CI matrix entries, a real-runtime smoke test per target, a build targets table row when the project has one |

## Levels

| Level | Meaning |
|---|---|
| Repeatable | clean-checkout CI build, one command per target |
| Hermetic | every input declared and pinned; no undeclared network access |
| Reproducible | two independent builds give identical bytes |

## Toolchain versions

Take each version from the vendor's release build (release notes, published artifacts and checksums), never from the vendor's CI configuration.

## Artifact naming

`<name>-<version>-<os>-<arch>.<ext>` plus a SHA-256 checksum.

## Nondeterminism sources

Timestamps (`SOURCE_DATE_EPOCH`), file order, locale and timezone, absolute paths, randomness, unpinned inputs, host features, parallel output order.

## Generated assets

Built, not committed: a build target with declared inputs and outputs, one reusable CI step keyed on a hash of generator, inputs and tool versions, outputs ignored. [build-generated-asset](workflow-build-generated-asset.md) runs the method.

## Cache rules

- Key includes OS, arch, toolchain version, lockfile hash, build config.
- Partial restore only for safe caches (downloads).
- Release builds use no caches or only verified content-addressed caches; untrusted branches cannot write caches release builds read.
- A cold build must pass.

## Docs owed

Reference row per target; how-to for local builds and reproducibility checks; explanation for runner/toolchain choices; tutorial update if first build changes.
