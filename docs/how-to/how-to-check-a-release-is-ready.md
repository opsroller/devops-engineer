# How to check a release is ready

*How-to guide, for a project lead or engineer about to tag a release.*

This guide shows you how to get a go/no-go decision for a version before
tagging it, using the `release-readiness` workflow.

1. Make sure the commit you intend to release is on the default branch and
   its CI run has finished.
2. Ask Claude:

   ```
   Run the devops-engineer release-readiness workflow with
   args { version: "1.4.0" }
   ```

   If you want to limit the check, add `platforms` and `stores`, for
   example `{ version: "1.4.0", platforms: ["windows-x86_64"], stores: [] }`.
   Otherwise they come from the project profile.
3. Read `decision`:
   - `go`: hand the result to the project-manager; once confirmed, tag
     `v1.4.0` on the checked commit.
   - `no-go`: work through `blockers`. Each is prefixed with its area
     (`build:<target>`, `store:<store>`, `licenses`, `supply-chain`,
     `changelog`, `docs`). Run the workflow again after fixing.
4. Check `unverified`. An area listed there was not checked; treat it as a
   blocker until it runs.
5. Give `owner_actions` to the owner. These are steps only they can take
   (store agreements, signing keys); each has exact instructions.
6. Review and merge the documentation PR in `docs_pr` (changelog, release
   notes) before or with the tag.

See the [release-readiness reference](../reference/workflow-release-readiness.md)
for all arguments and outputs, and
[How to cut a release](how-to-cut-a-release.md) for tagging.
