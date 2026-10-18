# How to add a build target

*How-to guide, for an engineer adding a platform or architecture to a
project's builds.*

This guide shows you how to add a target, such as `linux-arm64`, with a
reproducible CI build, using the `add-build-target` workflow.

1. Add the target to the project profile's list of platforms, so every
   role sees it.
2. Ask Claude:

   ```
   Run the devops-engineer add-build-target workflow with
   args { target: "linux-arm64" }
   ```

   If the target ships through a store, add `store`, for example
   `{ target: "android-arm64", store: "<store name>" }`.
3. Review the plan the workflow logs (runner, toolchain pins, build
   options, artifact name). If you disagree with the runner choice, stop
   the run and record your preference in the project profile first.
4. When it finishes, read `decision`:
   - `ready-for-review`: the draft PR on `branch` has the build, the CI
     job, verification evidence and docs. Request review.
   - `blocked`: read `open` (verification failures) or `doc_problems`;
     fix and rerun, or continue by hand on the same branch.
5. Give `owner_actions` (for example, creating a signing certificate) to
   the owner.

See the [add-build-target reference](../reference/workflow-add-build-target.md)
for all arguments and outputs.
