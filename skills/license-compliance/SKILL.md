---
name: license-compliance
description: Use when creating files, adding a dependency or asset, preparing a release's notices and source, maintaining the credits list, making a repository REUSE-compliant, or wiring a license check into CI.
---

# License compliance automation

Every file the project ships has known licensing; every obligation of every
license (including the project's own) is met in every release; CI enforces
it so compliance does not depend on memory. Grounded in the REUSE
specification (3.3), SPDX license identifiers, OpenChain ISO/IEC 5230
(compliance programme) and the CISA SBOM license field. You apply the
project's declared license policy; legal questions go to the owner.

## Rules

- **Every file the project creates carries the project's license.** New
  source, docs, scripts, configs and workflows get the project's SPDX
  header (or a `.license` sidecar / `REUSE.toml` entry for files that cannot
  hold comments). **Never accept a template's or generator's default
  license** (scaffolding tools often write MIT or similar): replace it with
  the project license before the first commit.
- Third-party files keep their own license and copyright; never relabel.
- Use SPDX identifiers and expressions (`GPL-2.0-or-later`,
  `MIT AND CC-BY-4.0`), not prose.
- One **credits source** (a single machine-readable file listing people,
  works and their licenses/attributions) feeds every place credits appear:
  the in-product credits screen, the release notices, and the website (built
  by the frontend-web-developer). Never maintain two lists.

## REUSE layout (per the spec)

- `LICENSES/<SPDX-ID>.txt` for every license used, and none unused.
- Commentable files: header near the top with `SPDX-FileCopyrightText:` and
  `SPDX-License-Identifier:`.
- Uncommentable files (images, audio, binaries): `<file>.license` sidecar,
  or a `REUSE.toml` annotation (`version = 1`, `[[annotations]]` with
  `path`, `SPDX-FileCopyrightText`, `SPDX-License-Identifier`; `*` within a
  directory, `**` across).
- A root `LICENSE`/`COPYING` may stay for platforms that look for it.
- CI runs a REUSE linter (e.g. `reuse lint`) as a required check.

## Method: adding a dependency or asset

1. Identify its license from the upstream source (license file, headers,
   package metadata); record the SPDX identifier and copyright holders.
   Unknown -> stop and ask the provider or the owner.
2. Check compatibility against the project's policy table (outbound license
   vs inbound licenses, linking/bundling model, distribution form). If the
   project license is copyleft, inbound code must be compatible with it;
   if it is permissive, copyleft inbound changes what the project can ship.
   Conflict -> block and report to the owner with options.
3. Record it: SBOM picks it up; add to the credits source if attribution is
   required; vendor its license text into `LICENSES/` or the notices bundle.
4. Note any special duties: attribution in-product, NOTICE file
   propagation, source offer, modification notices, trademark limits.

## Method: release notices and source

1. Generate the notices bundle from the SBOM and credits source: every
   component, its license text and copyright lines. Ship it inside the
   product (an "open-source licenses" screen or file) and attach it to the
   release.
2. **Copyleft source duties.** For copyleft components or a copyleft
   project license, every shipped binary has its **complete corresponding
   source** for that exact version available (source archive attached to
   the release, tagged revision public), with build scripts and the
   license text, linked from the release page, the store page and the
   in-product about/licenses screen. For GPL-2.0, either ship the source with
   the binary or provide a written offer per the license; publishing the
   tagged source alongside the binary is the simple default.
3. Verify the bundle matches the SBOM (no component missing) in CI.
4. Hand the notices file, source URL and credits source to the
   frontend-web-developer for the credits/licensing page.

## Compliance programme (OpenChain-style, lightweight)

- A written license policy in the project docs: outbound license, allowed
  / review-needed / disallowed inbound licenses, who decides.
- A named owner for compliance questions (the owner, unless delegated).
- Records: per release, SBOM, notices bundle, source archive, REUSE lint
  result. Keep them with the release.

## Quality bar

- `reuse lint` (or equivalent) is green and required on every PR.
- Every release carries notices, SBOM and the source archive for that
  exact version.
- No file in the repository carries a license other than the project's
  unless it is third-party and recorded as such.

## Failure modes

- Scaffolded files left under the generator's default license.
- Copying code or assets "from the internet" without a recorded license.
- Credits maintained by hand in several places, drifting apart.
- Source for an old binary no longer obtainable (tag deleted, archive not
  attached).
- Notices bundle built from a stale list rather than the SBOM.

## Documentation this work owes (Diataxis)

- License policy, credits source format, notices contents -> **reference**.
- New contributor procedure -> **how-to** ("How to add a third-party
  asset", "How to make a file REUSE-compliant").
- Choice of project license or a compatibility decision -> **explanation**
  (owned by the owner's decision; you record it).
