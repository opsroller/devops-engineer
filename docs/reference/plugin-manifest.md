# Plugin manifest

*Reference, for maintainers of this plugin.*

File: `.claude-plugin/plugin.json`.

| Field | Value |
|---|---|
| `name` | `devops-engineer` |
| `version` | `0.5.0` |
| `description` | one-sentence summary of the role |
| `author.name` | `opsroller` |
| `repository` | `https://github.com/opsroller/devops-engineer` |
| `license` | `GPL-2.0-or-later` |
| `keywords` | `role`, `job-function`, `devops`, `release-engineering`, `build-engineering`, `ci-cd`, `supply-chain-security`, `license-compliance` |

## Layout

| Path | Contents |
|---|---|
| `agents/devops-engineer.md` | the agent |
| `skills/<name>/SKILL.md` | seven skills; checklists beside two of them |
| `workflows/<name>.js` | four workflows; line 1 is `// SPDX-License-Identifier: GPL-2.0-or-later` |
| `docs/` | tutorials, how-to, reference, explanation |
| `LICENSE` | GNU GPL version 2 text |
