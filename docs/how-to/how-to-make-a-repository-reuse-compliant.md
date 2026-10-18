# How to make a repository REUSE-compliant

*How-to guide, for an engineer who needs every file's license to be
machine-readable and checked in CI.*

This guide shows you how to bring an existing repository to REUSE
compliance with the devops-engineer role.

1. Make sure the project license is declared in `CLAUDE.md` as an SPDX
   identifier.
2. Ask Claude:

   ```
   Use the devops-engineer agent to make this repository REUSE-compliant
   on a branch named chore/reuse, following the license-compliance skill.
   ```

3. The agent will:
   - put each license used into `LICENSES/<SPDX-ID>.txt`;
   - add `SPDX-FileCopyrightText` and `SPDX-License-Identifier` headers to
     the project's own files, with the project license;
   - add `.license` sidecars or `REUSE.toml` entries for images, audio and
     binaries;
   - leave third-party files under their own license and record them;
   - add a REUSE lint job to CI and make it a required check.
4. Review the PR, paying attention to any file it marked third-party or
   unknown. Unknown files need the owner's decision before merge.
5. If a scaffolding tool generated files with its own default license,
   confirm they now carry the project license.

See the [license-compliance reference](../reference/skill-license-compliance.md).
