# supply-chain-security skill

*Reference, for anyone looking up what the supply-chain-security skill covers.*

| Field | Value |
|---|---|
| Files | `skills/supply-chain-security/SKILL.md`, `skills/supply-chain-security/posture-checklist.md` |
| Used when | adding/updating dependencies or pipeline steps, SBOMs, provenance, signing, secrets, posture review |
| Produces | lockfiles, pins, SBOMs, provenance, signatures, posture reports |

## SLSA Build levels

| Level | Requirement | Protects against |
|---|---|---|
| L1 | provenance exists | release mistakes; aids inventory |
| L2 | hosted build platform; signed provenance | post-build tampering |
| L3 | isolated ephemeral builds; signing keys unreachable by build steps | tampering during the build, insider and cross-tenant threats |

## SBOM fields (CISA minimum elements)

SBOM author, tool name/version, timestamp, format and version; per component: name, version, producer, identifier (PURL/CPE), hash, license (SPDX), dependency relationships; transitive coverage; unknowns marked. Format: SPDX or CycloneDX. One per release.

## Posture checklist

Based on the OpenSSF Scorecard checks: branch protection, code review, binary artifacts, security policy, dangerous workflow patterns, token permissions, pinned dependencies, SAST, fuzzing, webhooks, dependency update tool, vulnerabilities, packaging, signed releases, plus SBOM and provenance.

## Docs owed

Reference for dependency policy and SBOM/provenance format; how-to for verifying signatures and adding dependencies; explanation for posture decisions.

[upgrade-dependency](workflow-upgrade-dependency.md) applies pinning and checksum verification to one dependency or toolchain upgrade; [repin-lockfile](workflow-repin-lockfile.md) moves a hash-locked lockfile to another interpreter or platform at the same versions.
