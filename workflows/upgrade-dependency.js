// SPDX-License-Identifier: GPL-2.0-or-later
export const meta = {
  name: 'upgrade-dependency',
  description: 'Upgrade one dependency or toolchain (library, engine, compiler, SDK, runner image, CI action) end to end: target version from upstream, every reference found, exact pins with verified checksums, license and notice changes, cache keys, a before/after A/B on the same inputs, independent verification, docs. args: { dependency: "<name>" (required), to: "<target version, optional; default the latest stable>", why: "<reason, optional>" }',
  phases: [
    { title: 'Plan', detail: 'target version, every reference, pins and checksums, license and notice changes, cache keys, breaking changes, baseline measures' },
    { title: 'Build', detail: 'one agent changes every reference on a branch, verifies checksums, updates notices, runs the build and tests, opens a draft PR; its push is the handoff for deliver-package or land-pr' },
    { title: 'Compare', detail: 'parallel read-only checks: A/B on the same inputs, integrity, licensing, caches, ownership; fix loop' },
    { title: 'Docs', detail: 'toolchain reference, upgrade notes, explanation of choices' },
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

const USAGE = 'usage: upgrade-dependency { dependency: "<name>", to: "<target version, optional>", why: "<reason, optional>" }'
const dep = args && typeof args.dependency === 'string' ? args.dependency.trim() : ''
if (!dep) return `missing dependency. ${USAGE}`
const to = args && args.to ? String(args.to).trim() : ''
const why = args && args.why ? String(args.why).trim() : ''

const DOCS_FRAGMENT = 'Classify every user-visible change in this work with the Diataxis compass (action/cognition x study/work). For each, update or add exactly one page of that kind under docs/<kind>/, keep each page to one kind, title it by the project pattern, and link to the related pages of the other kinds. Report pages touched and any change you left undocumented and why.'

const PLAN = { type: 'object', properties: {
  branch: { type: 'string' },
  current: { type: 'string' },
  target: { type: 'string' },
  source: { type: 'string' },
  references: { type: 'array', items: { type: 'object', properties: {
    path: { type: 'string' }, what: { type: 'string' } }, required: ['path', 'what'] } },
  pins: { type: 'array', items: { type: 'object', properties: {
    artifact: { type: 'string' }, ref: { type: 'string' }, checksum: { type: 'string' }, checksum_source: { type: 'string' } },
    required: ['artifact', 'ref', 'checksum', 'checksum_source'] } },
  breaking: { type: 'array', items: { type: 'string' } },
  license: { type: 'object', properties: {
    before: { type: 'string' }, after: { type: 'string' }, compatible: { type: 'boolean' }, notices: { type: 'array', items: { type: 'string' } } },
    required: ['before', 'after', 'compatible', 'notices'] },
  caches: { type: 'array', items: { type: 'string' } },
  ab: { type: 'array', items: { type: 'object', properties: {
    measure: { type: 'string' }, how: { type: 'string' }, before: { type: 'string' }, tolerance: { type: 'string' } },
    required: ['measure', 'how', 'before', 'tolerance'] } },
  cross_role: { type: 'array', items: { type: 'object', properties: {
    path: { type: 'string' }, owner: { type: 'string' }, edit: { type: 'string' } }, required: ['path', 'owner', 'edit'] } },
  rollback: { type: 'string' },
  blockers: { type: 'array', items: { type: 'string' } },
  docs: { type: 'array', items: { type: 'object', properties: {
    kind: { type: 'string', enum: ['tutorial', 'how-to', 'reference', 'explanation'] },
    page: { type: 'string' }, reason: { type: 'string' } }, required: ['kind', 'page', 'reason'] } },
}, required: ['branch', 'current', 'target', 'source', 'references', 'pins', 'breaking', 'license', 'caches', 'ab', 'cross_role', 'rollback', 'docs'] }

const BUILD = { type: 'object', properties: {
  branch: { type: 'string' },
  pr: { type: 'string' },
  head_sha: { type: 'string' },
  checksums_verified: { type: 'boolean' },
  tests_pass: { type: 'boolean' },
  after: { type: 'array', items: { type: 'object', properties: {
    measure: { type: 'string' }, after: { type: 'string' } }, required: ['measure', 'after'] } },
  runs: { type: 'array', items: { type: 'string' } },
  notes: { type: 'string' },
  problem: { type: 'string' },
}, required: ['branch', 'pr', 'checksums_verified', 'tests_pass', 'after'] }

const CHECK = { type: 'object', properties: {
  blocking: { type: 'array', items: { type: 'string' } },
  evidence: { type: 'array', items: { type: 'string' } },
  notes: { type: 'array', items: { type: 'string' } },
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
  `Plan an upgrade of "${dep}"${to ? ` to ${to}` : ' to its latest stable release'}${why ? ` (why: ${why})` : ''}; planning only, write nothing.
Read the project's CLAUDE.md, profile (stack, owned paths, CI provider) and build files. Follow the devops-engineer skills supply-chain-security, cross-platform-builds, license-compliance and ci-pipelines.
Return:
- branch: a name such as build/upgrade-<slug>.
- current: the version in use now; target: the exact version to move to, read from the upstream release page or registry (source: its URL), never a moving tag such as "latest" or a major-only range.
- references: every place that names the dependency or its version: build files, lockfiles, bindings or submodules, CI pipeline files, container images, setup scripts, export or packaging templates, docs, version constants. Search the whole repository; a missed reference is a split-version build.
- pins: every artifact the upgrade downloads (archives, binaries, images, actions), each with its immutable reference (exact version plus commit SHA or digest), its checksum, and where the checksum comes from (an upstream checksum file or signature, not one you computed from the same download).
- breaking: changes in the upstream changelog between current and target that touch what the project uses, each with the file it affects; empty if none.
- license: the license before and after, whether the new one is compatible with the project's license, and every notice, credits or third-party file that must change (license-compliance skill).
- caches: every CI or build cache whose key must change so no artifact built with the old version is reused (cross-platform-builds skill).
- ab: the before/after comparison, run on the same inputs on both versions: at least the build result and duration, the test suite result, the size of the main build outputs, and any output the project can compare directly (rendered images, exported files, benchmark numbers). For each: the measure, how to run it, the value on the default branch now (before), and the tolerance that counts as unchanged.
- cross_role: paths the profile assigns to another role that must change, with owner and the minimal edit (engineering-practices peer-coordination skill). Empty if none.
- rollback: how to go back to the current version.
- blockers: anything that stops the upgrade (incompatible license, no published checksum, a breaking change with no migration). Empty if none.
- docs (Diataxis compass): at least the reference page that lists toolchain and dependency versions; a how-to if contributors must do something new (reinstall, clear a cache); an explanation if a choice was made between versions.`,
  { schema: PLAN, phase: 'Plan', label: 'plan' })
if (!plan) return 'planning failed: no plan returned; nothing was changed'
if ((plan.blockers || []).length) return { decision: 'blocked', open: plan.blockers, plan }
if (!plan.license.compatible) return { decision: 'blocked', open: [`license changes from ${plan.license.before} to ${plan.license.after}, not compatible with the project's license`], plan }

const FACTS = `Dependency: ${dep}, ${plan.current} -> ${plan.target} (source: ${plan.source})
Branch: ${plan.branch}
References: ${JSON.stringify(plan.references)}
Pins: ${JSON.stringify(plan.pins)}
Breaking changes: ${plan.breaking.length ? plan.breaking.join('; ') : 'none found'}
License: ${plan.license.before} -> ${plan.license.after}; notices to update: ${plan.license.notices.join('; ') || 'none'}
Cache keys to change: ${plan.caches.join('; ') || 'none'}
A/B measures (before): ${JSON.stringify(plan.ab)}
Cross-role edits: ${plan.cross_role.length ? JSON.stringify(plan.cross_role) : 'none'}
Rollback: ${plan.rollback}`

phase('Build')
const built = await agent(
  `As the only agent editing files, upgrade ${dep} on branch ${plan.branch}, cut from the latest remote default branch:
${FACTS}
Rules: change every listed reference in one PR, so no build mixes versions; pin each download by its immutable reference and verify its checksum against the upstream source in the build or pipeline, failing on mismatch; adapt the code for each breaking change with the smallest edit; update every notice, credits and third-party license file listed; change each listed cache key so it includes the new version; regenerate lockfiles and generated files with the project's tooling, never by hand. Every new file carries the project's license header.
${plan.cross_role.length ? 'Make each cross-role edit as planned, in its own commit, list it under "Cross-role edits" in the PR description and message each owner with the PR link (engineering-practices peer-coordination skill).' : ''}
Run the project's build and tests, then each A/B measure on the new version with the same inputs and method as the before value. Commit (build: or chore(deps): Conventional Commits), push, open a draft PR whose description lists the version change, pins and checksums, breaking changes handled, notices changed, cache keys changed, and a before/after table. Run CI on the branch. Follow the engineering-practices git-workflow skill.
Return the branch, the PR URL, head SHA, whether every checksum was verified, whether the build and tests pass on that head, each measure's after value, the CI run links, notes, and the problem if the build or tests fail.`,
  { schema: BUILD, phase: 'Build', label: 'build' })
if (!built) return { decision: 'blocked', reason: 'build agent returned nothing', plan }
if (!built.checksums_verified) return { decision: 'blocked', open: ['a download could not be verified against its upstream checksum'], pr: built.pr, plan }
if (!built.tests_pass) return { decision: 'blocked', open: [`build or tests fail on ${plan.target}${built.problem || built.notes ? ': ' + (built.problem || built.notes) : ''}`], pr: built.pr, plan }

phase('Compare')
const table = plan.ab.map((m) => {
  const a = (built.after || []).find((x) => x.measure === m.measure)
  return { measure: m.measure, how: m.how, before: m.before, after: a ? a.after : 'not measured', tolerance: m.tolerance }
})
const checks = [
  ['ab', `Re-run the before/after comparison independently: for each measure, run it on the default branch and on ${plan.branch} with the same inputs and method, and compare with the builder's table ${JSON.stringify(table)}. A measure outside its tolerance, or not measured, is blocking unless the PR description explains the change and it is an improvement or an accepted cost. For image or file outputs, compare the files and say what differs.`],
  ['integrity', `Confirm every reference is on ${plan.target} (search the whole branch for ${plan.current} and for ${dep}), each download is pinned by its immutable reference, and each checksum is verified against an upstream source and fails the build on mismatch (supply-chain-security skill).`],
  ['licensing', `Confirm the license of ${dep} ${plan.target} is ${plan.license.after}, still compatible with the project's license, and every notice, credits and third-party file matches the new version (license-compliance skill).`],
  ['caches', `Confirm every cache that could hold artifacts built with ${plan.current} has a key that now includes ${plan.target}, that the branch CI run did not restore an old cache for them, and that cache sizes stay within the provider's limits (cross-platform-builds skill).`],
  ['ownership', plan.cross_role.length
    ? `Confirm each cross-role edit is the minimal planned one (${JSON.stringify(plan.cross_role)}), in its own commit, listed under "Cross-role edits" in the PR description, with each owner messaged; and no other path outside the role's owned paths changed.`
    : 'Confirm the diff touches only paths the profile assigns to the DevOps role (or shared append-only files); any other path is blocking unless it is listed under "Cross-role edits" with its owner notified.'],
]
let open = []
let evidence = []
for (let round = 1; round <= 3; round++) {
  const res = await pipeline(checks, ([name, task]) =>
    agent(`${task}\nPR ${built.pr}, branch ${plan.branch}. Read-only: do not edit, commit or push; return blocking findings and evidence (run links, file:line, numbers).`, { schema: CHECK, phase: 'Compare', label: `${name}:${round}`, independent: true })
      .then(r => r ? { name, ...r } : { name, blocking: [`${name}: checker returned nothing; unverified`], evidence: [] }))
  open = res.flatMap(r => r.blocking.map(b => `${r.name}: ${b}`))
  evidence = res.map(r => ({ check: r.name, evidence: r.evidence }))
  if (!open.length || round === 3) break
  const f = await agent(`On ${plan.branch}, as the only editor, fix these findings, re-run the build, tests and any A/B measure they touch, commit and push. Never disable or weaken a check, or widen a tolerance, to get green:\n- ${open.join('\n- ')}`, { phase: 'Compare', label: `fix:${round}` })
  if (!f) break
}
if (open.length) return { decision: 'blocked', open, evidence, ab: table, pr: built.pr, plan }

phase('Docs')
const docs = await agent(
  `On ${plan.branch}, as the only agent editing docs, document this upgrade.
Pages planned: ${JSON.stringify(plan.docs)}
${FACTS}
After values: ${JSON.stringify(table)}
The reference page that lists toolchain and dependency versions must show ${plan.target}, its pinned reference and checksum source. If contributors must reinstall or clear a cache, the how-to says how.
${DOCS_FRAGMENT}
Commit (docs: ...), push. Return the pages touched, any change left undocumented and why, and the head commit SHA after your push.`,
  { schema: DOCS, phase: 'Docs', label: 'docs' })

phase('Docs check')
const dc = await agent(
  `Check the docs changes on ${plan.branch} against the Diataxis review checklist: one kind per page, how-to titles name a goal, explanation titles read "About ...", reference rows match the existing table format, links connect the kinds, and no page still names ${plan.current} as the version in use. Do not edit anything. Report problems with page and line.`,
  { schema: DOCCHECK, phase: 'Docs check', label: 'docs-check', independent: true })
const docProblems = !docs ? ['documentation agent returned nothing'] : !dc ? ['documentation check did not run; docs unverified'] : dc.problems

const result = {
  decision: docProblems.length ? 'blocked' : 'ready-for-review',
  dependency: dep,
  from: plan.current,
  to: plan.target,
  branch: plan.branch,
  pr: built.pr,
  pins: plan.pins,
  breaking: plan.breaking,
  license: plan.license,
  caches: plan.caches,
  ab: table,
  cross_role: plan.cross_role,
  rollback: plan.rollback,
  doc_problems: docProblems,
  evidence,
  next: `after the code reviewer passes, run /engineering-practices:land-pr { pr: "${built.pr}" } (keeps the branch current, polls CI itself and squash-merges)`,
}
if (result.decision === 'blocked') return result

// The handoff is what engineering-practices deliver-package takes as prior, built from
// the Build step's push; the Build gate above already stops a red build.
if (!built.branch) return { decision: 'blocked', open: [built.problem || 'build step returned no branch; the upgrade may be unpushed'], evidence, ab: table, pr: built.pr, plan }
return {
  ...result,
  handoff: {
    from: 'devops-engineer:upgrade-dependency',
    branch: built.branch,
    pr: built.pr || '',
    head_sha: docs.head_sha || built.head_sha || '',
    tests_pass: true,
    docs: docs.pages || [],
    undocumented: docs.undocumented || [],
    notes: [`${dep} ${plan.current} -> ${plan.target}`]
      .concat(plan.cross_role.map(c => `cross-role edit: ${c.path} (${c.owner})`)),
  },
  next: `ship it without rebuilding: /engineering-practices:deliver-package { wp: "<the package>", prior: <this result> }; with no work package, after the code reviewer passes, /engineering-practices:land-pr { pr: "${built.pr}" } (keeps the branch current, polls CI itself and squash-merges)`,
}
})(RUN.agent, RUN.phase, RUN.log)]); return RUN.finish(RUN_OUT)
