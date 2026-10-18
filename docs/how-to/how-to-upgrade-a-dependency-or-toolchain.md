# How to upgrade a dependency or toolchain

*How-to guide, for an engineer moving a project to a new version of a
library, engine, compiler, SDK, runner image or CI action.*

This guide shows you how to land one upgrade with the
`upgrade-dependency` workflow, with every reference moved together,
downloads pinned and checksummed, notices and cache keys updated, and a
before/after comparison in the PR. For a new CI stage, use
[how to add or change a pipeline stage](how-to-add-or-change-a-pipeline-stage.md).

1. Pick the dependency and, if you need a specific one, the exact target
   version. Without one, the workflow takes the latest stable release.
2. Ask Claude:

   ```
   Run the devops-engineer upgrade-dependency workflow with
   args { dependency: "<name>", to: "<version>", why: "<reason>" }
   ```

   If your session must not spawn agents, add
   `run: { mode: "inline" }`.
3. Read the plan the workflow logs. Check `references` against what you
   know uses the dependency, that every `pins` entry has an upstream
   checksum source, and that the `ab` measures cover what you care about
   (for a renderer or engine, include a rendered-image comparison).
4. When it finishes, read `decision`:
   - `ready-for-review`: the draft PR on `branch` has the upgrade, a
     before/after table, comparison evidence and docs. Hand it to the
     code reviewer, then land it with engineering-practices land-pr.
   - `blocked`: read `open`. A license or checksum blocker needs a
     decision before any code changes; anything else, fix and rerun with
     `run.from` and the returned `results`.
5. Tell contributors about any cache to clear or tool to reinstall; the
   how-to the workflow wrote says how.

See the [upgrade-dependency reference](../reference/workflow-upgrade-dependency.md)
for all arguments and outputs.
