# license-compliance skill

*Reference, for anyone looking up what the license-compliance skill covers.*

| Field | Value |
|---|---|
| File | `skills/license-compliance/SKILL.md` |
| Used when | creating files, adding dependencies or assets, preparing notices and source, credits, REUSE, CI license checks |
| Produces | SPDX headers, `LICENSES/`, `REUSE.toml`, notices bundle, credits source, source archives |

## Rules

- Every file the project creates carries the project license; a template's or generator's default license is never accepted.
- Third-party files keep their own license and copyright.
- SPDX identifiers and expressions only.
- One credits source feeds the in-product credits, release notices and website.
- Unknown or incompatible license blocks the change.

## REUSE layout

| Item | Rule |
|---|---|
| `LICENSES/<SPDX-ID>.txt` | one per license used; none unused |
| Comment header | `SPDX-FileCopyrightText`, `SPDX-License-Identifier` |
| `<file>.license` | sidecar for uncommentable files |
| `REUSE.toml` | `version = 1`, `[[annotations]]` with `path`, copyright, license |
| CI | REUSE lint as a required check |

## Release obligations

Notices bundle generated from SBOM and credits source, in-product and attached; for copyleft, complete corresponding source for the exact version attached and linked from release page, store page and in-product licenses screen.

## Docs owed

Reference for license policy, credits format, notices; how-to for contributor procedures; explanation for license decisions.
