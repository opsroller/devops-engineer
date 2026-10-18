---
name: cross-platform-builds
description: Use when adding or fixing a build target (desktop, mobile, web, console or server), making builds reproducible or hermetic, pinning toolchains, designing build caches, or investigating "it builds on one machine but not another".
---

# Cross-platform and reproducible builds

Goal: the same source revision, built on any clean runner, yields the same
artifact for each target; caches make it fast without making it wrong.
Grounded in the SRE book ("hermetic builds": builds insensitive to what is
installed on the machine, toolchains versioned with the revision) and the
Reproducible Builds project (identical bit-for-bit outputs from the same
inputs, e.g. `SOURCE_DATE_EPOCH` for timestamps).

## Levels to aim for

1. **Repeatable**: CI builds every target from a clean checkout with one
   documented command per target.
2. **Hermetic**: all inputs declared and pinned: toolchain, SDKs, base
   images, dependencies (lockfile with hashes), build scripts. No network
   access beyond declared, pinned fetches.
3. **Reproducible**: two independent builds of the same revision produce
   identical bytes (or differences are understood and documented, e.g. an
   embedded signature).

Most projects should hold level 2 for all release targets and aim for 3 on
the main artifacts.

## Method: adding a build target

1. Read the profile: target platforms, minimum OS/API versions, architectures,
   packaging format, signing needs, store (if any).
2. Choose the runner: native runner for the target OS where signing or
   platform SDKs require it; cross-compilation or containers where the
   toolchain supports it cleanly. Record why.
3. Pin the toolchain and SDK versions in the repository (a version file,
   container image digest or toolchain manifest), not in runner setup by
   hand.
4. Write the build as a script the developer can also run; CI calls the
   same script. Pass configuration explicitly (target, arch, build type).
5. Produce a named, versioned artifact: `<name>-<version>-<os>-<arch>.<ext>`,
   plus a SHA-256 checksum.
6. Smoke-test the packaged artifact on the target (launch, basic check,
   exit code) in CI.
7. Add it to the integration matrix; mark it required once stable.
8. Hand signing to `store-distribution` and the SBOM/provenance to
   `supply-chain-security`.
9. Document: reference row for the target (runner, toolchain, artifact
   name, command), how-to "How to build <target> locally".

## Nondeterminism checklist

| Source | Fix |
|---|---|
| Timestamps in archives, binaries, generated files | honour `SOURCE_DATE_EPOCH` (set it from the commit time); normalize archive mtimes |
| File and directory order | sort inputs; use tools' deterministic/sorted options |
| Locale, timezone | set a fixed locale and `TZ=UTC` in the build |
| Absolute build paths embedded | build in a fixed path or use path-prefix remapping |
| Randomness (hash seeds, temp names, UUIDs) | fix seeds; avoid embedding random IDs |
| Unpinned dependencies or toolchains | lockfile with hashes; pinned versions/digests |
| Host-dependent features (CPU flags, installed libs) | set target flags explicitly; hermetic sysroot or container |
| Parallelism-dependent output order | make output order independent of job scheduling |

Verify by building twice (different runners or clean directories) and
comparing digests; on a mismatch, use a diff tool for build artifacts (e.g.
diffoscope) to find the cause.

## Caching rules

- **Key = everything that changes the output**: OS, arch, toolchain
  version, lockfile hash, build config. Missing any of these produces wrong
  but green builds.
- **Restore keys** may fall back to a partial match only for caches that are
  safe to reuse partially (dependency downloads), never for compiled outputs
  unless the build tool validates them.
- **Release builds**: either build without caches or only use caches that
  the build tool content-addresses and verifies. Untrusted branches must
  not be able to write caches that release builds read (cache poisoning).
- Track hit rate and the time saved; delete caches that do not pay.

## Quality bar

- Every release target is built by CI from a clean checkout with pinned
  inputs and one script per target.
- Two builds of a release revision give identical digests, or the
  difference is documented.
- A cold build (no cache) still passes; caches only change speed.

## Failure modes

- Toolchain installed by hand on a long-lived runner ("snowflake builder").
- `latest`/floating base images or SDK versions.
- Cache key missing the toolchain version: stale objects linked into a new
  build.
- Per-platform scripts that drift apart; share one script with parameters.
- Building release artifacts from a dirty tree or with local changes.

## Documentation this work owes (Diataxis)

- New or changed target -> **reference**: build targets table (runner,
  toolchain pins, command, artifact name).
- New procedure -> **how-to**: "How to build <target> locally", "How to
  verify a build is reproducible".
- Runner or toolchain decision -> **explanation** (ADR style).
- First-build experience for a newcomer changed -> **tutorial** update,
  tested from a clean start.
