# Run your first pipeline audit

*Tutorial, for someone new to this plugin who wants to see the DevOps
engineer role do one real job from start to finish.*

In this tutorial we will run a read-only audit of a project's license
compliance, read the findings, and have the role fix one of them on a
branch. It takes about fifteen minutes. We use the license area because
every repository has one and the audit changes nothing until we ask it to.

## Before we start

We need:

- Claude Code with the `engineering-practices` and `devops-engineer`
  plugins installed (see the README's Install section).
- A git repository of our own, with a `CLAUDE.md` at its root, opened in
  Claude Code. A clean working tree on its default branch.

## 1. Check the role can onboard

Ask Claude:

```
Use the devops-engineer agent. Onboard to this project and tell me the
project license, the build targets and the CI provider you found.
```

The agent loads `engineering-practices`, runs its `project-onboarding`
skill and answers with three facts. The output should look like:

```
Project license: <an SPDX identifier, e.g. GPL-2.0-or-later>
Build targets: <list, or "none declared">
CI provider: <name, or "none found">
```

Notice that it reads these from our `CLAUDE.md` and repository rather than
guessing. If it reports something missing, add that line to `CLAUDE.md`
and ask again.

## 2. Run the audit

Ask Claude:

```
Run the devops-engineer pipeline-audit workflow with
args { areas: ["licenses"], fix: false }
```

The workflow shows its phases: **Plan**, **Audit**, **Docs** and
**Docs check**. The Fix phase is skipped because `fix` is false.

## 3. Read the findings

When it finishes, the result contains a `findings` list. Each finding looks
like:

```
{ "area": "licenses", "severity": "medium",
  "where": "scripts/release.sh",
  "problem": "no SPDX-License-Identifier header",
  "fix": "add the project license header" }
```

Notice the `owner_actions` list: anything only the repository owner can do
appears there, never as something the agent did. Notice also `decision`:
`done` means the audit and its documentation check passed.

## 4. Fix one finding

Pick the first finding and ask:

```
Use the devops-engineer agent to fix the first finding on a branch named
chore/license-headers, following the license-compliance skill, and open a
draft PR.
```

The agent creates the branch, adds the header with the project's license,
commits with a Conventional Commit such as
`chore: add license header to release script`, and opens a draft PR. It
replies with the PR link.

## 5. Look at the docs it touched

During step 2 the workflow's Docs phase also pushed a branch named
`docs/pipeline-audit`. Ask Claude to show its diff:

```
Show me the diff of the docs/pipeline-audit branch against the default branch.
```

We see the project's pipeline reference page now records the audit result
and its open findings. Notice that it is a reference page: it describes the
state and gives no instructions. That is the role documenting its own work.

## What we did

We onboarded the role to a project, ran one workflow read-only, read its
findings and owner actions, and turned one finding into a reviewed change
with its documentation. Next, try
[How to audit and harden the pipeline](../how-to/how-to-audit-and-harden-the-pipeline.md)
for all areas, or read [About the DevOps engineer role](../explanation/about-the-role.md).
