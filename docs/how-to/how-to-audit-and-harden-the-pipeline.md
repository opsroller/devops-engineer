# How to audit and harden the pipeline

*How-to guide, for an engineer or lead who wants the delivery pipeline
checked and improved.*

This guide shows you how to find and fix weaknesses in CI, builds, supply
chain, license compliance and pipeline monitoring with the `pipeline-audit`
workflow.

1. Start read-only:

   ```
   Run the devops-engineer pipeline-audit workflow with args { fix: false }
   ```

   To audit only some areas, pass `areas`, for example
   `{ areas: ["ci", "supply-chain"] }`.
2. Sort the returned `findings` by `severity`. Critical and high findings
   on triggers, tokens, branch protection and signing come first.
3. Hand `owner_actions` to the owner (repository settings, secrets, keys).
4. When you want the role to apply the fixes, run it again with
   `{ fix: true }`. It applies fixes on `ci/pipeline-audit-fixes`, has them
   independently reviewed up to three rounds, and documents them.
5. If `decision` is `blocked`, read `open_blockers` and `doc_problems`.
   Nothing is merged; finish the fixes on the branch or rerun.
6. Compare the before/after pipeline numbers reported in the PR.

If you want a scheduled check, ask the agent to add a weekly pipeline job
that runs the posture checklist; see the
[supply-chain-security reference](../reference/skill-supply-chain-security.md).
