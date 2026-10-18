# Devops Engineer

DevOps engineer: CI pipelines, cross-platform builds, releases from Conventional Commits, store submissions, and open-source license compliance and credits.

This plugin is a **job function**, not a project. It says how the job is done; the project it works on says with which tools, in its `CLAUDE.md` and project profile.

## Skills

| Skill | Use when |
|---|---|
| `ci-pipelines` | Use when creating or fixing CI workflows. |
| `cross-platform-builds` | Use when adding a target platform or fixing a platform build. |
| `release-management` | Use when cutting a release, generating a changelog or bumping versions. |
| `store-distribution` | Use when preparing or submitting builds to app stores or desktop storefronts. |
| `license-compliance` | Use when adding dependencies, preparing a release, or building credits and notices. |

## Workflows

Multi-agent workflows (Claude Code Workflow scripts in `workflows/`).

| Workflow | Does |
|---|---|
| `/devops-engineer:release-readiness` | Check every platform build, license notices and store requirements in parallel before a release |

## Agent

`agents/devops-engineer.md` defines the role as a subagent.

## Install

```
/plugin marketplace add opsroller/claude-plugins
/plugin install devops-engineer@opsroller
```

Versioned on its own with semver tags (`v0.1.0`). Changes follow Conventional Commits.
