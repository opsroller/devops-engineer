# devops-engineer

A Claude Code plugin for the **DevOps engineer** job function (also called
build engineer or release engineer). The role keeps a project building,
testing and shipping: CI/CD pipelines, reproducible cross-platform builds
and caching, semantic-versioned releases, store distribution and signing,
supply-chain security (pinned dependencies, SBOMs, SLSA provenance),
license compliance automation, and observability of the pipeline itself.
It is a job, not a project: it says how the work is done well, and each
project's `CLAUDE.md` and profile say with which tools.

## Install

```
/plugin marketplace add opsroller/claude-plugins
/plugin install engineering-practices@opsroller
/plugin install devops-engineer@opsroller
```

`engineering-practices` is the shared base every role loads first.

## Documentation

- **Start here.** The tutorial [Run your first pipeline audit](docs/tutorials/first-task.md)
  walks through one read-only audit and its first fix, step by step.
- **Get a job done.** How-to guides for the role's real tasks:
  [check a release is ready](docs/how-to/how-to-check-a-release-is-ready.md),
  [cut a release](docs/how-to/how-to-cut-a-release.md),
  [add a build target](docs/how-to/how-to-add-a-build-target.md),
  [add or change a pipeline stage](docs/how-to/how-to-add-or-change-a-pipeline-stage.md),
  [upgrade a dependency or toolchain](docs/how-to/how-to-upgrade-a-dependency-or-toolchain.md),
  [make a generated asset a build output](docs/how-to/how-to-make-a-generated-asset-a-build-output.md),
  [audit and harden the pipeline](docs/how-to/how-to-audit-and-harden-the-pipeline.md) and
  [make a repository REUSE-compliant](docs/how-to/how-to-make-a-repository-reuse-compliant.md).
- **Look something up.** The [reference index](docs/reference/index.md)
  describes the agent, each of the seven skills, each workflow's arguments
  and outputs, and the plugin manifest. Research sources are in
  [SOURCES.md](SOURCES.md).
- **Understand the job.** [About the DevOps engineer role](docs/explanation/about-the-role.md)
  covers what the job is, where it ends and neighbouring roles begin, its
  quality bars, the trade-offs behind its methods and how it grows from
  junior to senior.

Versioned on its own with SemVer tags; changes follow Conventional Commits.

## License

Copyright (C) 2026 Charles (opsroller) and contributors. Licensed under the GNU General Public License v2.0 or later (`GPL-2.0-or-later`); see `LICENSE`.
