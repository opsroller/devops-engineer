# release-management skill

*Reference, for anyone looking up what the release-management skill covers.*

| Field | Value |
|---|---|
| File | `skills/release-management/SKILL.md` |
| Used when | cutting a release, choosing a version, writing changelogs, branching, hotfixes, rollback |
| Produces | tags, `CHANGELOG.md` entries, release notes, release pages |

## Version bump from commits

| Commits since last tag | Bump |
|---|---|
| `BREAKING CHANGE:` footer or `!` | major |
| `feat` | minor |
| `fix`, `perf` | patch |
| only `docs`, `chore`, `ci`, `test`, `refactor`, `build` | none (or patch by project rule) |

## Rules

- A public API must be declared; SemVer is relative to it.
- `0.y.z` is initial development.
- Released versions never change; fixes are new versions; tags are never moved.
- Deprecate in a minor, remove in a later major.
- Release branches: fixes land on main first, then are cherry-picked; never merged back.
- Release stage promotes integration artifacts; it does not rebuild.

## Release contents

SemVer tag, changelog entry (Added, Changed, Deprecated, Removed, Fixed, Security), release notes, checksums, SBOM, provenance, notices, source archive.

## Docs owed

Reference: changelog and notes per release; how-to for upgrade steps and release procedures; explanation for the release model.
