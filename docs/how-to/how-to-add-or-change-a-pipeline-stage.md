# How to add or change a pipeline stage

*How-to guide, for an engineer adding a CI/CD stage or check, or changing
one, in a project's delivery pipeline.*

This guide shows you how to land one stage or check, such as a format
check on pull requests or an asset validation job, with the
`change-pipeline` workflow. For a new platform build, use
[how to add a build target](how-to-add-a-build-target.md) instead; for
a review of the whole pipeline, use
[how to audit and harden the pipeline](how-to-audit-and-harden-the-pipeline.md).

1. Write the change in one sentence with its reason, for example "run
   the asset validator on PRs that touch assets, so broken imports fail
   before merge".
2. Ask Claude:

   ```
   Run the devops-engineer change-pipeline workflow with
   args { change: "<your sentence>" }
   ```

   If your session must not spawn agents, add
   `run: { mode: "inline" }`. To force the required-check decision, add
   `required: "yes"` or `required: "no"`.
3. Read the plan the workflow logs. Check the failure meaning, the
   permissions and the artifact retention. If the repository is public,
   check that nothing in `artifacts` should stay private. If `cross_role`
   lists paths another role owns, make sure each edit is small enough to
   explain in one line; otherwise stop and ask that role to make it.
4. When it finishes, read `decision`:
   - `ready-for-review`: the draft PR on `branch` has the stage, a run on
     the branch, verification evidence and docs. Request review.
   - `blocked`: read `open` or `doc_problems`; fix and rerun with
     `run.from` and the returned `results`, or continue by hand on the
     same branch.
5. Act on `required_check`. If it says `required-after-green-runs`, add
   the check to branch protection once it has that many green runs.
6. Give `owner_actions` (for example, a branch protection setting) to
   whoever can change repository settings.

See the [change-pipeline reference](../reference/workflow-change-pipeline.md)
for all arguments and outputs, and the
[ci-pipelines skill](../reference/skill-ci-pipelines.md) for the method
it follows.
