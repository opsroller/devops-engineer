# Reference

*Reference landing page, for users of the devops-engineer plugin who need
to look up what a part of it is or takes.*

The plugin has one agent, seven skills and five workflows. Each has its own
page with the same layout.

## Agent

- [devops-engineer agent](agent.md): the role as a subagent: when it is
  used, responsibilities, quality bar, boundaries and never-list.

## Skills

Building and shipping:
- [ci-pipelines](skill-ci-pipelines.md): pipeline stages, gates, flaky tests, trigger and token security.
- [cross-platform-builds](skill-cross-platform-builds.md): build targets, hermetic and reproducible builds, caches.
- [release-management](skill-release-management.md): SemVer, changelogs, branching, hotfixes, rollback.
- [store-distribution](skill-store-distribution.md): store sheets, signing, staged rollout, owner-only actions.

Trust and evidence:
- [supply-chain-security](skill-supply-chain-security.md): pinning, SBOM, SLSA provenance, posture checklist.
- [license-compliance](skill-license-compliance.md): REUSE, project license on every file, notices, copyleft source, credits.
- [pipeline-observability](skill-pipeline-observability.md): DORA metrics, pipeline health signals, release health.

## Workflows

- [release-readiness](workflow-release-readiness.md): go/no-go for a version.
- [pipeline-audit](workflow-pipeline-audit.md): audit and optionally fix the pipeline.
- [add-build-target](workflow-add-build-target.md): add one platform target end to end.
- [change-pipeline](workflow-change-pipeline.md): add or change one CI/CD stage or check end to end.
- [upgrade-dependency](workflow-upgrade-dependency.md): upgrade one dependency or toolchain with pins, checksums, notices, cache keys and a before/after comparison.

## Plugin

- [Plugin manifest](plugin-manifest.md): fields of `.claude-plugin/plugin.json`.
- [SOURCES.md](../../SOURCES.md): the research the role is built on.
