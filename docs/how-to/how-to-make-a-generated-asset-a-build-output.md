# How to make a generated asset a build output

*How-to guide, for an engineer whose repository commits files a script
generates (textures, atlases, fonts, shader variants, data tables) and
who wants the build to produce them instead.*

This guide shows you how to stop committing generated files and have
the local build and CI generate them, cached, with the
`build-generated-asset` workflow. To add an unrelated CI check, use
[how to add or change a pipeline stage](how-to-add-or-change-a-pipeline-stage.md).

1. Write one sentence naming the outputs, the generator and why, for
   example "build the theme textures from tools/gen_textures.py and its
   inputs instead of committing the PNGs, which bloat the repository".
2. Ask Claude:

   ```
   Run the devops-engineer build-generated-asset workflow with
   args { asset: "<your sentence>" }
   ```

   If your session must not spawn agents, add `run: { mode: "inline" }`.
3. Read the plan the workflow logs. Check that `consumers` lists every
   job that reads the outputs (tests, builds, exports, the web build),
   that `hash_inputs` covers the generator, every input and the tool
   versions, and that only the default branch (or the PR's own branch
   scope) can write the cache. If `cross_role` lists the generator's
   owner, make sure each edit is one line you can explain.
4. When it finishes, read `decision`:
   - `ready-for-review`: the draft PR on `branch` adds the build target
     and CI step, wires every consumer, ignores and untracks the outputs,
     and carries verification evidence and docs. For a work package,
     run engineering-practices deliver-package with
     `{ wp: "<the package>", prior: <the whole result> }`; otherwise land
     `handoff.branch` with engineering-practices land-pr. `next` gives
     both commands.
   - `blocked`: read `open` (for example, the generator needs a tool the
     runners lack) or `doc_problems`; fix and rerun with `run.from` and
     the returned `results`.
5. After it merges, tell everyone who edits the inputs that the outputs
   no longer live in the repository and give them the local regenerate
   command from the build reference.

See the [build-generated-asset reference](../reference/workflow-build-generated-asset.md)
for all fields, and the
[cross-platform-builds skill](../reference/skill-cross-platform-builds.md)
for the caching and determinism rules it follows.
