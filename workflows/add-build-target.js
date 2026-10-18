// SPDX-License-Identifier: GPL-2.0-or-later
export const meta = {
  name: 'add-build-target',
  description: 'Add a new platform build target end to end: design, pinned reproducible CI build, signing and store sheet, SBOM and license coverage, independent verification, and docs. args: { target: "<platform/arch, e.g. linux-x86_64>" (required), store?: "<store name>" }',
  phases: [
    { title: 'Plan', detail: 'runner, toolchain pins, artifact name, signing, docs to touch' },
    { title: 'Build', detail: 'one agent implements the build script and CI job, pushes and opens a draft PR; its push is the handoff for deliver-package or land-pr' },
    { title: 'Verify', detail: 'parallel read-only checks: reproducibility, real runtime, matrix, compliance, signing/store; fix loop' },
    { title: 'Docs', detail: 'reference row, how-to, explanation of choices' },
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

const USAGE = 'usage: add-build-target { target: "<platform-arch>", store?: "<store>" }'
const target = args && typeof args.target === 'string' ? args.target.trim() : ''
if (!target) return `missing target. ${USAGE}`
const store = args && typeof args.store === 'string' ? args.store.trim() : ''

const DOCS_FRAGMENT = 'Classify every user-visible change in this work with the Diataxis compass (action/cognition x study/work). For each, update or add exactly one page of that kind under docs/<kind>/, keep each page to one kind, title it by the project pattern, and link to the related pages of the other kinds. Report pages touched and any change you left undocumented and why.'

const PLAN = { type: 'object', properties: {
  branch: { type: 'string' },
  runner: { type: 'string' },
  toolchain_pins: { type: 'array', items: { type: 'string' } },
  build_options: { type: 'array', items: { type: 'string' } },
  artifact_name: { type: 'string' },
  signing: { type: 'string' },
  owner_actions: { type: 'array', items: { type: 'string' } },
  runtime_check: { type: 'object', properties: {
    runtime: { type: 'string' }, command: { type: 'string' }, asserts: { type: 'string' } },
    required: ['runtime', 'command', 'asserts'] },
  has_sbom: { type: 'boolean' },
  targets_page: { type: 'string' },
  docs: { type: 'array', items: { type: 'object', properties: {
    kind: { type: 'string', enum: ['tutorial', 'how-to', 'reference', 'explanation'] },
    page: { type: 'string' }, reason: { type: 'string' } }, required: ['kind', 'page', 'reason'] } },
}, required: ['branch', 'runner', 'toolchain_pins', 'build_options', 'artifact_name', 'runtime_check', 'has_sbom', 'docs'] }

const CHECK = { type: 'object', properties: {
  blocking: { type: 'array', items: { type: 'string' } },
  owner_actions: { type: 'array', items: { type: 'string' } },
  evidence: { type: 'array', items: { type: 'string' } },
}, required: ['blocking', 'evidence'] }

const BUILD = { type: 'object', properties: {
  branch: { type: 'string' },
  pr: { type: 'string' },
  head_sha: { type: 'string' },
  tests_pass: { type: 'boolean' },
  runs: { type: 'array', items: { type: 'string' } },
  problem: { type: 'string' },
}, required: ['branch', 'pr', 'tests_pass'] }

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
  `Plan a new build target "${target}"${store ? ` distributed through ${store}` : ''}; planning only, write nothing. Read the project's CLAUDE.md and profile. Follow the devops-engineer cross-platform-builds skill (method: adding a build target)${store ? ' and store-distribution skill' : ''}.
Return: a branch name (e.g. build/add-${target}), runner choice and why, exact toolchain/SDK pins with checksum sources (take each version from the vendor's release build: its release notes, published artifacts and checksums, or the version the release binary reports, never from the vendor's own CI configuration, which can track a branch or a newer image), the explicit build options the job will pass, the artifact name pattern, the signing approach, steps only the owner can take.
runtime_check: how to run the built artifact in its real runtime, not only build it: the runtime (a headless browser for a web build, an emulator or device for mobile, the target OS for desktop or server), the one command that launches it in CI on committed content, and what it asserts (it loads, reaches its first screen or state, no runtime errors in the console or log, exit code).
has_sbom: whether the project already produces an SBOM. targets_page: the existing reference page that lists build targets, or "" if the project has none.
Docs (Diataxis compass): a reference entry for the target (a row in targets_page, or a new reference page for build targets if there is none), a how-to "How to build ${target} locally", and an explanation if a runner or toolchain choice was made between alternatives.`,
  { schema: PLAN, phase: 'Plan', label: 'plan' })
if (!plan) return 'planning failed: no plan returned; nothing was built'

phase('Build')
const built = await agent(
  `On branch ${plan.branch}, as the only agent editing files, implement the ${target} build:
- runner: ${plan.runner}
- toolchain pins (verify each download's checksum or signature): ${plan.toolchain_pins.join('; ')}
- explicit build options for this job: ${plan.build_options.join('; ')}
- artifact: ${plan.artifact_name} plus SHA-256 checksum
- run it in its real runtime in CI after the build: ${plan.runtime_check.runtime}, \`${plan.runtime_check.command}\`, asserting ${plan.runtime_check.asserts}; run the same command locally before pushing
Use one build script the developer can also run; the CI job calls it. Make sure any new option you add does not change the behaviour of existing jobs (set it explicitly in each). Every new file carries the project's license header, never a template default. Run the full matrix, commit (build:/ci: Conventional Commits), push, open a draft PR. Follow the engineering-practices git-workflow skill. Return the branch, the PR URL, the head commit SHA you pushed, whether the full matrix and the runtime check pass on that head, the CI run links, and the problem if they do not.`,
  { schema: BUILD, phase: 'Build', label: 'build' })
if (!built) return { decision: 'blocked', reason: 'build agent returned nothing', plan }

phase('Verify')
const checks = [
  ['reproducibility', `Build ${target} twice from the PR head in clean environments (or compare two CI runs) and compare digests; walk the nondeterminism checklist; confirm a cold (no-cache) build passes and cache keys include OS, arch, toolchain version, lockfile hash and build config (cross-platform-builds skill).`],
  ['runtime', `Run the built ${target} artifact from the PR head in its real runtime (${plan.runtime_check.runtime}) with \`${plan.runtime_check.command}\` and confirm ${plan.runtime_check.asserts}; read the console or log for runtime errors, not only the exit code. Confirm CI runs the same check after the build and fails when it fails (ci-pipelines, cross-platform-builds skills).`],
  ['matrix', `Confirm every pre-existing CI job still passes with unchanged behaviour, every job passes its build options explicitly, and all downloads are pinned and checksum-verified (ci-pipelines skill).`],
  ['compliance', `Confirm ${plan.has_sbom ? `the ${target} artifact is covered by the project's SBOM, and it` : `the ${target} artifact (the project produces no SBOM yet: suggest one under owner_actions or evidence, never as blocking)`} bundles the notices file from the single credits source, new files carry the project license, and any new toolchain-bundled runtime libraries have recorded, compatible licenses (license-compliance, supply-chain-security skills).`],
  ...(store ? [['store', `Draft or update the store sheet for ${store} for this target and confirm signing is set up in CI and verified after signing; list every owner-only step with exact instructions; never act in the owner's name (store-distribution skill). Return the sheet text in evidence; do not edit files.`]] : []),
]
let open = []
let owner_actions = plan.owner_actions || []
let evidence = []
let fixed = false
for (let round = 1; round <= 3; round++) {
  const res = await pipeline(checks, ([name, task]) =>
    agent(`${task}\nBranch ${plan.branch}. Read-only: do not edit, commit or push; return findings.`, { schema: CHECK, phase: 'Verify', label: `${name}:${round}`, independent: true })
      .then(r => r ? { name, ...r } : { name, blocking: [`${name}: checker returned nothing; unverified`], evidence: [] }))
  open = res.flatMap(r => r.blocking.map(b => `${r.name}: ${b}`))
  owner_actions = [...new Set([...owner_actions, ...res.flatMap(r => r.owner_actions || [])])]
  evidence = res.map(r => ({ check: r.name, evidence: r.evidence }))
  if (!open.length || round === 3) break
  const f = await agent(`On ${plan.branch}, as the only editor, fix these verification findings, rerun CI, commit and push:\n- ${open.join('\n- ')}`, { phase: 'Verify', label: `fix:${round}` })
  if (!f) break
  fixed = true
}
if (open.length) return { decision: 'blocked', open, owner_actions, evidence, plan }

phase('Docs')
const docs = await agent(
  `On ${plan.branch}, as the only agent editing docs, document the new ${target} target.
Pages planned: ${JSON.stringify(plan.docs)}
Facts: runner ${plan.runner}; pins ${plan.toolchain_pins.join('; ')}; options ${plan.build_options.join('; ')}; artifact ${plan.artifact_name}; signing ${plan.signing || 'n/a'}; evidence ${JSON.stringify(evidence)}.
${store ? `Add the ${store} store sheet as reference from the store check evidence.` : ''}
${DOCS_FRAGMENT}
Commit (docs: ...), push. Return the pages touched, any change left undocumented and why, and the head commit SHA after your push.`,
  { schema: DOCS, phase: 'Docs', label: 'docs' })

phase('Docs check')
const dc = await agent(
  `Check the docs changes on ${plan.branch} against the Diataxis review checklist: one kind per page, "How to ..." and "About ..." titles, reference rows match the existing table format, links connect the kinds; if a tutorial changed, run it from a clean start. Do not edit anything. Report problems with page and line.`,
  { schema: DOCCHECK, phase: 'Docs check', label: 'docs-check', independent: true })
const docProblems = !docs ? ['documentation agent returned nothing'] : !dc ? ['documentation check did not run; docs unverified'] : dc.problems

const result = {
  decision: docProblems.length ? 'blocked' : 'ready-for-review',
  target,
  branch: plan.branch,
  doc_problems: docProblems,
  owner_actions,
  evidence,
}
if (result.decision === 'blocked') return result

// The handoff is what engineering-practices deliver-package takes as prior, built from
// the Build step's push (a fix round that then verified clean counts as green).
if (!built.branch) return { decision: 'blocked', open: [built.problem || 'build step returned no branch; the work may be unpushed'], owner_actions, evidence, plan }
if (!built.tests_pass && !fixed) return { decision: 'blocked', open: [`matrix or runtime check fails on ${built.branch}${built.head_sha ? ' at ' + built.head_sha : ''}: ${built.problem || 'no details'}`], owner_actions, evidence, plan }
return {
  ...result,
  handoff: {
    from: 'devops-engineer:add-build-target',
    branch: built.branch,
    pr: built.pr || '',
    head_sha: docs.head_sha || built.head_sha || '',
    tests_pass: true,
    docs: docs.pages || [],
    undocumented: docs.undocumented || [],
    notes: owner_actions.map(a => `owner action: ${a}`),
  },
  next: `ship it without rebuilding: /engineering-practices:deliver-package { wp: "<the package>", prior: <this result> }; with no work package, /engineering-practices:land-pr { branch: "${built.branch}" }`,
}
})(RUN.agent, RUN.phase, RUN.log)]); return RUN.finish(RUN_OUT)
