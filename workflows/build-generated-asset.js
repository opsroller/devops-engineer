// SPDX-License-Identifier: GPL-2.0-or-later
export const meta = {
  name: 'build-generated-asset',
  description: 'Make a generated asset (textures, atlases, fonts, shaders, data tables, docs: anything a script produces from tracked inputs) a build output instead of a committed file: a build-system target with declared inputs and outputs, one reusable CI step (composite action or template) that every consuming job calls, a cache keyed on a hash of the generator, its inputs and its tool versions, ignore rules and removal of the committed outputs, independent checks of a clean-checkout build, cache hits and misses, determinism and wiring, and docs. Hands off to deliver-package. args: { asset: "<what is generated, by which generator, and why it should be built rather than committed>" (required) }',
  phases: [
    { title: 'Plan', detail: 'generator, inputs, outputs, consumers, build target, CI step, input hash and cache key, pins, ignore rules, owned paths, docs' },
    { title: 'Build', detail: 'one agent adds the build target and reusable CI step, wires every consumer, ignores and untracks the outputs, runs CI on a branch and opens a draft PR' },
    { title: 'Verify', detail: 'parallel read-only checks: clean checkout, cache, determinism, wiring, security, ownership; fix loop' },
    { title: 'Docs', detail: 'build reference, regenerate-locally how-to, explanation of why the asset is built' },
    { title: 'Docs check', detail: 'one Diataxis kind per page' },
  ],
}

// --- run-modes v2 begin ---
const RUN = ((a, realAgent, realPhase, realLog) => {
  const opted = !!(a && typeof a === 'object' && a.run && typeof a.run === 'object')
  const c = opted ? a.run : {}
  const mode = c.mode === 'inline' ? 'inline' : 'agents'
  const results = c.results && typeof c.results === 'object' ? c.results : {}
  const reviewers = c.reviewers && typeof c.reviewers === 'object' ? c.reviewers : {}
  const only = Array.isArray(c.only) && c.only.length ? c.only.map(String) : null
  const from = c.from ? String(c.from) : null
  const titles = typeof meta !== 'undefined' && meta && Array.isArray(meta.phases) ? meta.phases.map((p) => p.title) : []
  const unknown = titles.length ? (from ? [from] : []).filter((t) => !titles.includes(t)) : []
  const error = c.mode && !['agents', 'inline'].includes(c.mode)
    ? `run.mode must be "agents" or "inline", got "${c.mode}"`
    : unknown.length ? `run.from names no phase: ${unknown.join(', ')}. Phases: ${titles.join(', ')}` : null
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k)
  // An answer must carry every required key of its schema, as the runtime
  // enforces for agents; returns the missing keys, or null when it fits.
  const missing = (v, schema) => {
    if (v === null || v === undefined) return 'an answer'
    if (!schema || schema.type !== 'object') return null
    if (typeof v !== 'object' || Array.isArray(v)) return 'a JSON object'
    const gap = (schema.required || []).filter((k) => !has(v, k) || v[k] === undefined)
    return gap.length ? gap.join(', ') : null
  }
  const seen = {}
  const out = {}
  // Who answered each step marked independent: "subagent" when this run
  // spawned it, else the reviewer named in run.reviewers, else "self".
  const by = {}
  const who = (k) => (typeof reviewers[k] === 'string' && reviewers[k].trim() ? reviewers[k].trim() : 'self')
  const skipped = []
  const next = []
  const logs = []
  let current = ''
  let reached = !from
  let halting = false
  let release = () => {}
  const halted = new Promise((r) => { release = r })
  const picked = (ph, label) => reached && (!only || only.some((s) => s === ph || s === label || label.startsWith(s + ':')))
  const agent = (prompt, opts) => {
    const op = opts || {}
    const independent = op.independent === true
    const ph = op.phase || current
    const base = op.label || ph || 'agent'
    seen[base] = (seen[base] || 0) + 1
    const key = seen[base] > 1 ? `${base}#${seen[base]}` : base
    let note = null
    if (has(results, key)) {
      const gap = missing(results[key], op.schema)
      if (!gap) { out[key] = results[key]; if (independent) by[key] = who(key); return Promise.resolve(results[key]) }
      note = `answer missing ${gap}; answer this brief again`
    }
    if (!picked(ph, base)) { skipped.push(key); return Promise.resolve(null) }
    if (mode === 'agents') {
      const pass = Object.assign({}, op)
      delete pass.independent
      return realAgent(prompt, opts ? pass : opts).then((r) => {
        if (r !== null && r !== undefined) { out[key] = r; if (independent) by[key] = 'subagent' }
        return r
      })
    }
    const brief = { key, phase: ph, prompt, schema: op.schema || null }
    if (independent) brief.independent = true
    if (note) brief.note = note
    next.push(brief)
    if (!halting) {
      halting = true
      // Wait 200 microtask turns before pausing, so every sibling in a
      // parallel() or pipeline() fan-out queues its brief into this pause.
      ;(async () => { for (let i = 0; i < 200; i++) await null; release('__run_halted__') })()
    }
    return new Promise(() => {})
  }
  const phase = (t) => { current = t; if (from && t === from) reached = true; return realPhase(t) }
  const log = (m) => { logs.push(String(m)); return realLog(m) }
  const finish = (value) => {
    if (!opted) return value
    const self_reviewed = Object.keys(by).filter((k) => by[k] === 'self')
    if (value === '__run_halted__') {
      return {
        run: 'inline', status: 'next', next, results: out, reviewers: by, self_reviewed, skipped, logs,
        how: 'Do each brief in next, in order: follow its prompt in this session (it may tell you to edit files, commit or push), and shape your answer to its schema when one is given, with every required field. A brief marked independent reviews work this run produced, so do not answer it yourself: send its prompt to a reviewer with no part in the work (the project\'s code-reviewer role, a fresh session or a fresh subagent), use their answer, and name them in run.reviewers under its key; if you must answer it yourself, it is listed in self_reviewed and must be reported as self-reviewed. A brief with a note was answered before without the fields it names. Add each answer to results under its key, then run this workflow again with the same args, run.results set to the merged results and run.reviewers to the merged reviewers. Repeat until status is "done". To avoid pasting results back on every call, drive the run with engineering-practices tools/run-inline.mjs and a state file instead: it stores each answer and prints only the next briefs.',
      }
    }
    return { run: mode, status: 'done', result: value, results: out, reviewers: by, self_reviewed, skipped, logs }
  }
  return { agent, phase, log, finish, halted, error }
})(typeof args === 'undefined' ? undefined : args, agent, phase, log)
if (RUN.error) return RUN.error
const RUN_OUT = await Promise.race([RUN.halted, (async (agent, phase, log) => {
// --- run-modes v2 end (workflow body follows; close it with the tail line) ---

const USAGE = 'usage: build-generated-asset { asset: "<what is generated, by which generator, and why it should be built rather than committed>" }'
const asset = args && typeof args.asset === 'string' ? args.asset.trim() : ''
if (!asset) return `missing asset. ${USAGE}`

const DOCS_FRAGMENT = 'Classify every user-visible change in this work with the Diataxis compass (action/cognition x study/work). For each, update or add exactly one page of that kind under docs/<kind>/, keep each page to one kind, title it by the project pattern, and link to the related pages of the other kinds. Report pages touched and any change you left undocumented and why.'

const PLAN = { type: 'object', properties: {
  branch: { type: 'string' },
  generator: { type: 'object', properties: {
    command: { type: 'string' }, path: { type: 'string' }, owner: { type: 'string' },
    tools: { type: 'array', items: { type: 'string' } } },
    required: ['command', 'path', 'tools'] },
  inputs: { type: 'array', items: { type: 'string' } },
  outputs: { type: 'array', items: { type: 'string' } },
  committed_outputs: { type: 'array', items: { type: 'string' } },
  consumers: { type: 'array', items: { type: 'object', properties: {
    where: { type: 'string' }, reads: { type: 'string' } }, required: ['where', 'reads'] } },
  build_target: { type: 'string' },
  ci_step: { type: 'string' },
  hash_inputs: { type: 'array', items: { type: 'string' } },
  cache: { type: 'string' },
  deterministic: { type: 'string' },
  pins: { type: 'array', items: { type: 'string' } },
  permissions: { type: 'string' },
  repo_public: { type: 'boolean' },
  baseline: { type: 'string' },
  budget: { type: 'string' },
  cross_role: { type: 'array', items: { type: 'object', properties: {
    path: { type: 'string' }, owner: { type: 'string' }, edit: { type: 'string' }, why_here: { type: 'string' } },
    required: ['path', 'owner', 'edit', 'why_here'] } },
  rollback: { type: 'string' },
  owner_actions: { type: 'array', items: { type: 'string' } },
  blockers: { type: 'array', items: { type: 'string' } },
  docs: { type: 'array', items: { type: 'object', properties: {
    kind: { type: 'string', enum: ['tutorial', 'how-to', 'reference', 'explanation'] },
    page: { type: 'string' }, reason: { type: 'string' } }, required: ['kind', 'page', 'reason'] } },
}, required: ['branch', 'generator', 'inputs', 'outputs', 'committed_outputs', 'consumers', 'build_target', 'ci_step', 'hash_inputs', 'cache', 'deterministic', 'pins', 'permissions', 'repo_public', 'baseline', 'budget', 'cross_role', 'rollback', 'docs'] }

const BUILD = { type: 'object', properties: {
  branch: { type: 'string' },
  pr: { type: 'string' },
  head_sha: { type: 'string' },
  runs: { type: 'array', items: { type: 'string' } },
  timings: { type: 'string' },
  result: { type: 'string', enum: ['green', 'red'] },
  tests_pass: { type: 'boolean' },
  problem: { type: 'string' },
}, required: ['branch', 'pr', 'runs', 'timings', 'result', 'tests_pass'] }

const CHECK = { type: 'object', properties: {
  blocking: { type: 'array', items: { type: 'string' } },
  owner_actions: { type: 'array', items: { type: 'string' } },
  evidence: { type: 'array', items: { type: 'string' } },
}, required: ['blocking', 'evidence'] }

const DOCCHECK = { type: 'object', properties: {
  problems: { type: 'array', items: { type: 'string' } },
}, required: ['problems'] }

const DOCS = { type: 'object', properties: {
  pages: { type: 'array', items: { type: 'string' } },
  undocumented: { type: 'array', items: { type: 'string' } },
  head_sha: { type: 'string' },
}, required: ['pages'] }

phase('Plan')
const plan = await agent(
  `Plan moving a generated asset from the repository into the build; planning only, write nothing: "${asset}".
Read the project's CLAUDE.md, profile (build system, CI provider, runner types, which role owns which paths, any policy on generated files) and the existing build and pipeline definitions. Follow the devops-engineer skills cross-platform-builds (caching rules, nondeterminism checklist), ci-pipelines (method: adding or changing a stage) and supply-chain-security.
Return:
- branch: a name such as build/<slug>.
- generator: the exact command that produces the outputs, the path of the generator script or tool, the role that owns it (from the profile), and every tool it needs with its version (interpreter, packages, binaries).
- inputs: every tracked file the generator reads (sources, parameters, the generator itself).
- outputs: every file it writes, at the path consumers expect.
- committed_outputs: outputs tracked in the repository today, which this change removes from version control.
- consumers: every place that reads the outputs: CI jobs (tests, builds, exports, packaging, web or site builds), the local build, editor or engine import steps, scripts. For each, where it is and what it reads. Missing one means a job that silently uses stale or absent files.
- build_target: the build-system rule that regenerates the outputs when an input changes, with inputs and outputs declared so an incremental build reruns it only when needed (for example a CMake add_custom_command with OUTPUT and DEPENDS plus an add_custom_target that consumers depend on, a make rule, or a package script), and the one command a contributor runs to regenerate locally.
- ci_step: one reusable CI step that sets up the pinned tools, restores the cache, runs the build target on a miss and saves the cache (a composite action, reusable workflow or pipeline template, at the provider's conventional path), and the list of jobs that call it.
- hash_inputs: everything that changes the outputs and so goes into the cache key: the generator, every input file, the tool versions or lockfile, the OS or runner image where output depends on it, and a key version prefix to bump by hand.
- cache: the cache's key (as an expression over hash_inputs), its restore paths, the scope that may write it (default branch only, or branch-scoped so an untrusted PR cannot poison a cache the default branch or a release reads), and whether release builds use it or regenerate cold.
- deterministic: whether two runs on the same inputs give byte-identical outputs; if not, the cause (timestamps, random seeds, thread order, float differences across platforms) and the fix or why outputs are cached per platform.
- pins: every tool, package and third-party CI step by exact version or immutable reference, with its checksum source.
- permissions: the token scopes the CI step needs (read-only by default).
- repo_public: whether the repository is public; if so, caches and artifacts are readable by anyone with read access.
- baseline: duration of the affected pipelines from recent default-branch runs; budget: what the step may add on a cache hit (seconds) and on a miss.
- cross_role: every path the change must touch that the profile assigns to another role (often the generator or its inputs, owned by an art, audio or content role), with its owner, the minimal edit and why it cannot live in a path you own (engineering-practices peer-coordination, cross-role edits). Empty if none.
- rollback: how to go back to committed outputs.
- owner_actions: steps only the owner can take (cache size limits, settings).
- blockers: only what prevents the move: the generator cannot run in CI (licensed tool, needs a GPU or network the runners lack, takes longer than any budget), or the project's policy requires the outputs to stay committed.
- docs (Diataxis compass): at least the build reference (target, CI step, cache key, outputs); a how-to "regenerate <asset> locally"; an explanation if a choice was made (built vs committed, cache scope, per-platform outputs).`,
  { schema: PLAN, phase: 'Plan', label: 'plan' })
if (!plan) return 'planning failed: no plan returned; nothing was changed'
if ((plan.blockers || []).length) return { decision: 'blocked', open: plan.blockers, plan }

const FACTS = `Asset: ${asset}
Branch: ${plan.branch}
Generator: ${JSON.stringify(plan.generator)}
Inputs: ${plan.inputs.join(', ')}
Outputs: ${plan.outputs.join(', ')}
Committed outputs to untrack: ${plan.committed_outputs.join(', ') || 'none'}
Consumers: ${JSON.stringify(plan.consumers)}
Build target: ${plan.build_target}
CI step: ${plan.ci_step}
Cache key inputs: ${plan.hash_inputs.join(', ')}
Cache: ${plan.cache}
Determinism: ${plan.deterministic}
Pins: ${plan.pins.join('; ')}
Permissions: ${plan.permissions}
Repository public: ${plan.repo_public}
Baseline: ${plan.baseline}
Time budget: ${plan.budget}
Cross-role edits: ${plan.cross_role.length ? JSON.stringify(plan.cross_role) : 'none'}
Rollback: ${plan.rollback}`

phase('Build')
const built = await agent(
  `As the only agent editing files, make this generated asset a build output on branch ${plan.branch}:
${FACTS}
Do it in this order, one commit each where it helps review:
1. The build target: declare every input and output so the build reruns the generator only when an input changes, and make every consumer target depend on it. Add the one local regenerate command.
2. The reusable CI step: set up the pinned tools (verify each download's checksum), compute the cache key from a hash of the listed key inputs, restore the cache, run the build target on a miss, save the cache only from the scope the plan allows, and fail with a message naming the local command if generation fails. Read-only permissions unless the plan says otherwise.
3. Wire every consumer listed in the plan to call the step (or to depend on the build target locally) before it reads the outputs; packaging and export jobs must include the outputs in what they ship.
4. Ignore the outputs (the project's ignore file, with a comment naming the build target) and remove the committed outputs from version control without deleting the inputs (for git: git rm --cached). Keep the inputs and generator tracked.
5. Run the project's build and tests from a clean checkout of the branch, then push, open a draft PR and let CI run.
Every new file carries the project's license header. Follow the engineering-practices git-workflow skill (build: or ci: Conventional Commits).
${plan.cross_role.length ? 'For each cross-role edit: make only the planned minimal edit, in its own commit, and list it under a "Cross-role edits" heading in the PR description (path, owner, what changed, why it could not live elsewhere). Then message each owner directly with that list and the PR link (engineering-practices peer-coordination skill).' : ''}
Return the branch, the PR URL, the head commit SHA you pushed, the run links, the CI step's duration on this run and the affected pipelines' total durations, whether the run is green, whether the project's checks and tests pass on that head (tests_pass), and the problem if they do not.`,
  { schema: BUILD, phase: 'Build', label: 'build' })
if (!built) return { decision: 'blocked', reason: 'build agent returned nothing', plan }

phase('Verify')
const checks = [
  ['clean', `From a fresh clone of the branch with no cache and none of the outputs present, run the project's build and tests: the build target must produce every output (${plan.outputs.join(', ')}) and everything that reads them must pass. Then touch one input and confirm an incremental build reruns the generator, and that an unchanged rebuild does not. Confirm the committed outputs are no longer tracked, the ignore rule covers them, and the inputs and generator are still tracked.`],
  ['cache', `On the branch's CI runs, show a cold run (cache miss: generator runs, cache saved) and a warm run (hit: generator skipped) with their step durations against the budget (${plan.budget}); a re-run of the same workflow is enough for the warm case. Confirm the key covers every item in ${JSON.stringify(plan.hash_inputs)}: changing any one of them must change the key (show the key expression), and nothing else is in it that changes on every run. Confirm restore keys never fall back to a partial match for these outputs, only the planned scope can write the cache, and release builds follow the plan (${plan.cache}). A cache that can serve outputs from different inputs is blocking (cross-platform-builds skill, caching rules).`],
  ['determinism', `Run the generator twice on the same inputs (clean directories) and compare output digests. Identical, or different only as the plan states (${plan.deterministic}) with outputs cached per platform where they differ by platform. Undocumented differences are blocking (cross-platform-builds skill, nondeterminism checklist).`],
  ['wiring', `List every job and build step that reads the outputs (search the pipeline files, build files and scripts for the output paths), and compare with the plan's consumers (${JSON.stringify(plan.consumers)}). Each must call the CI step or depend on the build target before reading; any job that reads an output without it, any package or export missing the outputs, or any consumer the plan missed is blocking.`],
  ['security', `Confirm read-only permissions unless justified, every tool, package and third-party step pinned and checksum-verified, no untrusted input interpolated into shell, and that a pull request from an untrusted branch cannot write a cache that the default branch or a release build reads (cache poisoning). The repository is ${plan.repo_public ? 'public: confirm caches and artifacts hold nothing that must stay private' : 'private'} (ci-pipelines, supply-chain-security skills).`],
  ['ownership', plan.cross_role.length
    ? `Confirm each cross-role edit is the minimal planned one (${JSON.stringify(plan.cross_role)}), sits in its own commit, is listed under "Cross-role edits" in the PR description, and that each owner was messaged with the PR link; and that no other path outside the role's owned paths changed.`
    : 'Confirm the diff touches only paths the profile assigns to the DevOps role (or shared append-only files such as the ignore file); any other path is blocking unless it is listed under "Cross-role edits" in the PR description with its owner notified.'],
]
let open = []
let owner_actions = plan.owner_actions || []
let evidence = []
let fixed = false
for (let round = 1; round <= 3; round++) {
  const res = await pipeline(checks, ([name, task]) =>
    agent(`${task}\nPR ${built.pr}, branch ${plan.branch}. Read-only: do not edit, commit or push; work in a scratch clone; return findings with evidence (run links, digests, file:line).`, { schema: CHECK, phase: 'Verify', label: `${name}:${round}`, independent: true })
      .then(r => r ? { name, ...r } : { name, blocking: [`${name}: checker returned nothing; unverified`], evidence: [] }))
  open = res.flatMap(r => r.blocking.map(b => `${r.name}: ${b}`))
  owner_actions = [...new Set([...owner_actions, ...res.flatMap(r => r.owner_actions || [])])]
  evidence = res.map(r => ({ check: r.name, evidence: r.evidence }))
  if (!open.length || round === 3) break
  const f = await agent(`On ${plan.branch}, as the only editor, fix these verification findings, rerun the pipeline, commit and push. Never weaken a check, widen a cache key fallback or re-commit the outputs to get green:\n- ${open.join('\n- ')}`, { phase: 'Verify', label: `fix:${round}` })
  if (!f) break
  fixed = true
}
if (open.length) return { decision: 'blocked', open, owner_actions, evidence, pr: built.pr, plan }

phase('Docs')
const docs = await agent(
  `On ${plan.branch}, as the only agent editing docs, document this generated asset.
Pages planned: ${JSON.stringify(plan.docs)}
${FACTS}
The build reference must list the outputs, the build target and local command, the CI step and the jobs that call it, the cache key inputs and write scope, and that the outputs are ignored and not committed. The how-to says how to regenerate the outputs locally and how to force a fresh cache (the key version prefix).
${DOCS_FRAGMENT}
Commit (docs: ...), push. Return the pages touched, any change left undocumented and why, and the head commit SHA after your push.`,
  { schema: DOCS, phase: 'Docs', label: 'docs' })

phase('Docs check')
const dc = await agent(
  `Check the docs changes on ${plan.branch} against the Diataxis review checklist: one kind per page, how-to titles name a goal, explanation titles read "About ...", reference rows match the existing table format, links connect the kinds, and the build reference matches the build and pipeline files on the branch. Do not edit anything. Report problems with page and line.`,
  { schema: DOCCHECK, phase: 'Docs check', label: 'docs-check', independent: true })
const docProblems = !docs ? ['documentation agent returned nothing'] : !dc ? ['documentation check did not run; docs unverified'] : dc.problems

const result = {
  decision: docProblems.length ? 'blocked' : 'ready-for-review',
  branch: plan.branch,
  pr: built.pr,
  outputs: plan.outputs,
  untracked: plan.committed_outputs,
  build_target: plan.build_target,
  ci_step: plan.ci_step,
  cache: plan.cache,
  baseline: plan.baseline,
  timings: built.timings,
  cross_role: plan.cross_role,
  doc_problems: docProblems,
  owner_actions,
  evidence,
}
if (result.decision === 'blocked') return result

// The handoff is what engineering-practices deliver-package takes as prior, built from
// the Build step's push (a fix round that then verified clean counts as green).
if (!built.branch) return { decision: 'blocked', open: [built.problem || 'build step returned no branch; the change may be unpushed'], owner_actions, evidence, pr: built.pr, plan }
if (!built.tests_pass && !fixed) return { decision: 'blocked', open: [`checks fail on ${built.branch}${built.head_sha ? ' at ' + built.head_sha : ''}: ${built.problem || 'no details'}`], owner_actions, evidence, pr: built.pr, plan }
return {
  ...result,
  handoff: {
    from: 'devops-engineer:build-generated-asset',
    branch: built.branch,
    pr: built.pr || '',
    head_sha: docs.head_sha || built.head_sha || '',
    tests_pass: true,
    docs: docs.pages || [],
    undocumented: docs.undocumented || [],
    notes: [`outputs built by ${plan.build_target}, no longer committed: ${plan.committed_outputs.join(', ') || 'none were'}`, `cache: ${plan.cache}`]
      .concat(plan.cross_role.map(c => `cross-role edit: ${c.path} (${c.owner})`))
      .concat(owner_actions.map(a => `owner action: ${a}`)),
  },
  next: `ship it without rebuilding: /engineering-practices:deliver-package { wp: "<the package>", prior: <this result> }; with no work package, /engineering-practices:land-pr { branch: "${built.branch}" }`,
}
})(RUN.agent, RUN.phase, RUN.log)]); return RUN.finish(RUN_OUT)
