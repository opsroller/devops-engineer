# How to cut a release

*How-to guide, for whoever publishes a version of a project that uses this
role.*

This guide shows you how to publish a version once it is ready.

1. Get a `go` from [How to check a release is ready](how-to-check-a-release-is-ready.md).
2. Confirm the version matches the commits since the last tag: a
   `BREAKING CHANGE` or `!` means major, a `feat` minor, a `fix` patch (see
   the [release-management reference](../reference/skill-release-management.md)).
3. Ask the devops-engineer agent to tag the checked commit:

   ```
   Use the devops-engineer agent to tag v1.4.0 on <commit> following the
   release-management skill.
   ```

   The tag triggers the project's release stage, which promotes the
   already-built artifacts, signs them and attaches checksums, SBOM,
   provenance, notices and the source archive.
4. When the release stage finishes, check the release page has every
   attachment listed above. If anything is missing, do not retag: fix the
   pipeline and publish `1.4.1`.
5. If the project ships through stores, ask the agent to upload to each
   store's test track, then follow the store's staged rollout. The owner
   presses submit or release unless they have delegated it to a pipeline.
6. Hand the artifact URLs, checksums and store links to the
   frontend-web-developer for the download page.
7. Watch release health for the agreed window. If the new version
   diverges from the previous one, pause the rollout and decide roll back
   or roll forward.

### If you need a hotfix

Fix on the default branch first. If the project uses release branches,
cherry-pick the fix onto `release/X.Y`; then tag `X.Y.(Z+1)`.
