// SPDX-License-Identifier: GPL-2.0-or-later
export const meta = {
  name: 'repin-lockfile',
  description: 'Repin one hash-locked lockfile to another interpreter, runtime or platform at the same package versions: regenerate it with the tool that made it, prove every version is unchanged and only hashes and markers moved, install it with hashes enforced on the target, move the references that name the old target, independent check. Lighter than upgrade-dependency: no version change, no license or A/B pass. args: { lockfile: "<path>" (required), target: "<interpreter, runtime or platform to lock for>" (required), keep?: "yes"|"no"|"decide" (keep the old target locked too; default "decide"), why: "<reason, optional>" }',
  phases: [
    { title: 'Plan', detail: 'generating tool and command, current target, version set, distributions for the target, references to move, verification command' },
    { title: 'Repin', detail: 'one agent regenerates the lockfile on a branch, diffs the version set, installs with hashes on the target, opens a draft PR; its push is the handoff for deliver-package or land-pr' },
    { title: 'Check', detail: 'one read-only check of the version set, hash sources, target install and references; fix loop' },
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

const USAGE = 'usage: repin-lockfile { lockfile: "<path>", target: "<interpreter, runtime or platform>", keep?: "yes"|"no"|"decide", why?: "<reason>" }'
const lockfile = args && typeof args.lockfile === 'string' ? args.lockfile.trim() : ''
const target = args && typeof args.target === 'string' ? args.target.trim() : ''
if (!lockfile || !target) return `missing ${!lockfile ? 'lockfile' : 'target'}. ${USAGE}`
const keep = args && args.keep ? String(args.keep).trim() : 'decide'
if (!['yes', 'no', 'decide'].includes(keep)) return `keep must be "yes", "no" or "decide", got "${keep}". ${USAGE}`
const why = args && args.why ? String(args.why).trim() : ''

const PLAN = { type: 'object', properties: {
  branch: { type: 'string' },
  tool: { type: 'string' },
  command: { type: 'string' },
  current_target: { type: 'string' },
  packages: { type: 'integer' },
  keep_old: { type: 'boolean' },
  keep_reason: { type: 'string' },
  missing: { type: 'array', items: { type: 'string' } },
  references: { type: 'array', items: { type: 'object', properties: {
    path: { type: 'string' }, edit: { type: 'string' } }, required: ['path', 'edit'] } },
  verify: { type: 'string' },
  docs: { type: 'array', items: { type: 'string' } },
  cross_role: { type: 'array', items: { type: 'object', properties: {
    path: { type: 'string' }, owner: { type: 'string' }, edit: { type: 'string' } }, required: ['path', 'owner', 'edit'] } },
  blockers: { type: 'array', items: { type: 'string' } },
}, required: ['branch', 'tool', 'command', 'current_target', 'packages', 'keep_old', 'keep_reason', 'missing', 'references', 'verify', 'docs', 'cross_role'] }

const REPIN = { type: 'object', properties: {
  branch: { type: 'string' },
  pr: { type: 'string' },
  head_sha: { type: 'string' },
  versions_unchanged: { type: 'boolean' },
  version_diff: { type: 'array', items: { type: 'string' } },
  marker_changes: { type: 'array', items: { type: 'string' } },
  install_pass: { type: 'boolean' },
  install_run: { type: 'string' },
  docs: { type: 'array', items: { type: 'string' } },
  problem: { type: 'string' },
}, required: ['branch', 'pr', 'versions_unchanged', 'version_diff', 'marker_changes', 'install_pass', 'install_run'] }

const FIX = { type: 'object', properties: {
  head_sha: { type: 'string' },
  install_pass: { type: 'boolean' },
}, required: ['head_sha', 'install_pass'] }

const CHECK = { type: 'object', properties: {
  blocking: { type: 'array', items: { type: 'string' } },
  evidence: { type: 'array', items: { type: 'string' } },
}, required: ['blocking', 'evidence'] }

phase('Plan')
const plan = await agent(
  `Plan repinning the lockfile ${lockfile} to ${target} with every package at the version it has now${why ? ` (why: ${why})` : ''}; planning only, write nothing.
Read the project's CLAUDE.md, profile (owned paths, CI provider) and the lockfile's header and the files it is generated from. Follow the devops-engineer skill supply-chain-security (pinning) and ci-pipelines.
Return:
- branch: a name such as build/repin-<slug>.
- tool and command: the tool that generated the lockfile, at its exact version, and the exact command that regenerates it for ${target} (the tool's target-version or platform options, or the same command run under ${target} in a container or on a runner). Read them from the lockfile header, project config or pipeline; if the tool is not pinned, pin the version that made the current file.
- current_target: what the lockfile is locked for now.
- packages: how many packages the lockfile pins.
- keep_old and keep_reason: ${keep === 'decide' ? `whether ${target} replaces the current target or both stay locked. Keep the old one when anything still installs the lockfile on it (another pipeline job, a container image, a supported platform); say what.` : keep === 'yes' ? 'true: both targets stay locked (one file covering both, or a second file, as the tool supports); say how.' : `false: ${target} replaces the current target; say what still uses the old one, if anything, so it moves too.`}
- missing: each package with no distribution (wheel, binary, build) for ${target} at its current version on the package index, and none that builds from source with the project's toolchain. Any entry means this is an upgrade, not a repin.
- references: every place that names the current target and must move with this change: pipeline setup steps, container images, tool config, version files, cache keys that name the target, docs. Empty when keep_old is true and nothing moves.
- verify: the command that installs the lockfile on ${target} from a clean environment with hash checking enforced (the tool's require-hashes or frozen mode), then runs the step that consumes it.
- docs: pages that name the current target as the one in use and must change; empty if none.
- cross_role: paths the profile assigns to another role that must change, with owner and the minimal edit (engineering-practices peer-coordination skill). Empty if none.
- blockers: anything that stops a same-version repin: an entry in missing, a generating tool that cannot target ${target}, hashes the index does not publish. Empty if none.`,
  { schema: PLAN, phase: 'Plan', label: 'plan' })
if (!plan) return 'planning failed: no plan returned; nothing was changed'
const blockers = (plan.blockers || []).concat((plan.missing || []).map((m) => `no distribution for ${target} at the pinned version: ${m}`))
if (blockers.length) return { decision: 'blocked', open: blockers, next: 'a package that must change version is an upgrade: run /devops-engineer:upgrade-dependency for it, then repin', plan }

const FACTS = `Lockfile: ${lockfile}, locked for ${plan.current_target}; repin to ${target} (${plan.keep_old ? 'keep the old target locked too' : 'replace the old target'}: ${plan.keep_reason})
Branch: ${plan.branch}
Tool and command: ${plan.tool}; ${plan.command}
Packages pinned: ${plan.packages}
References to move: ${plan.references.length ? JSON.stringify(plan.references) : 'none'}
Verify on ${target}: ${plan.verify}
Docs naming the old target: ${plan.docs.join('; ') || 'none'}
Cross-role edits: ${plan.cross_role.length ? JSON.stringify(plan.cross_role) : 'none'}`

phase('Repin')
const done = await agent(
  `As the only agent editing files, repin on branch ${plan.branch}, cut from the latest remote default branch:
${FACTS}
Rules: regenerate the lockfile with the planned tool and command, never by hand; take hashes from the package index as the tool records them, never computed from a local download; keep every package at its current version: before committing, list name and version from the old and new file and diff them. Only hashes, environment or platform markers and the generated header may change. A package that appears or disappears only behind a platform marker is listed with its marker; any version change is a failure, not something to fix by editing the file.
Move each listed reference and docs page to ${target}, nothing else. Every new file carries the project's license header.
${plan.cross_role.length ? 'Make each cross-role edit as planned, in its own commit, list it under "Cross-role edits" in the PR description and message each owner with the PR link (engineering-practices peer-coordination skill).' : ''}
Run the verify command on ${target} from a clean environment (a pipeline run on the branch, or a container or runner image of ${target}). Commit (build: or chore(deps): Conventional Commits), push, open a draft PR whose description gives the old and new target, the tool and command, "versions unchanged: N of N", marker-only changes, and the verify run. Follow the engineering-practices git-workflow skill.
Return the branch, PR URL, head SHA, whether the version sets are identical, every version difference (name old -> new; empty if none), marker-only changes, whether the hash-enforced install and consuming step pass on ${target}, the link or log of that run, the docs pages touched, and the problem if anything failed.`,
  { schema: REPIN, phase: 'Repin', label: 'repin' })
if (!done) return { decision: 'blocked', reason: 'repin agent returned nothing', plan }
if (!done.versions_unchanged || (done.version_diff || []).length) return { decision: 'blocked', open: [`versions changed: ${(done.version_diff || []).join('; ') || 'reported changed'}`], pr: done.pr, next: 'a version change is an upgrade: run /devops-engineer:upgrade-dependency, then repin', plan }
if (!done.branch) return { decision: 'blocked', open: [done.problem || 'repin step returned no branch; the change may be unpushed'], pr: done.pr, plan }
if (!done.install_pass) return { decision: 'blocked', open: [`hash-enforced install or consuming step fails on ${target}${done.problem ? ': ' + done.problem : ''}`], pr: done.pr, run_link: done.install_run, plan }

phase('Check')
let open = []
let evidence = []
let head = done.head_sha || ''
for (let round = 1; round <= 2; round++) {
  const r = await agent(
    `Check the lockfile repin in PR ${done.pr}, branch ${plan.branch}, against the default branch:
${FACTS}
Confirm: (1) name and version of every package are identical between the default branch's ${lockfile} and the branch's, ${plan.packages} packages, read from the files yourself; (2) every changed line is a hash, an environment or platform marker or the generated header, and each marker-only addition or removal is listed in the PR (${JSON.stringify(done.marker_changes)}); (3) the file matches what the planned tool and command produce (regenerate it in a scratch directory and diff), so it was not edited by hand; (4) the hash-enforced install and consuming step passed on ${target} in a clean environment (${done.install_run}); (5) every listed reference and docs page now names ${target}, ${plan.keep_old ? `and whatever still uses ${plan.current_target} still installs` : `and nothing outside the docs history still names ${plan.current_target} as the target in use`}; (6) the diff touches only paths the profile assigns to the DevOps role, or cross-role edits listed under "Cross-role edits" with the owner notified.
Read-only: do not edit, commit or push. Return blocking findings and evidence (run links, file:line, counts).`,
    { schema: CHECK, phase: 'Check', label: `verify:${round}`, independent: true })
  open = r ? r.blocking : ['checker returned nothing; unverified']
  evidence = r ? r.evidence : []
  if (!open.length || round === 2) break
  const f = await agent(`On ${plan.branch}, as the only editor, fix these findings by regenerating with the planned tool or moving references, re-run the verify command on ${target}, commit and push. Never edit the lockfile by hand or change a package version. Return the branch head SHA after your push and whether the verify command passes:\n- ${open.join('\n- ')}`, { schema: FIX, phase: 'Check', label: `fix:${round}` })
  if (!f) break
  head = f.head_sha || ''
}
if (open.length) return { decision: 'blocked', open, evidence, pr: done.pr, plan }

return {
  decision: 'ready-for-review',
  lockfile,
  from: plan.current_target,
  to: target,
  kept_old: plan.keep_old,
  packages: plan.packages,
  marker_changes: done.marker_changes,
  branch: done.branch,
  pr: done.pr,
  install_run: done.install_run,
  references: plan.references,
  cross_role: plan.cross_role,
  evidence,
  handoff: {
    from: 'devops-engineer:repin-lockfile',
    branch: done.branch,
    pr: done.pr || '',
    head_sha: head,
    tests_pass: true,
    docs: done.docs || [],
    undocumented: [],
    notes: [`${lockfile} repinned ${plan.current_target} -> ${target}, ${plan.packages} versions unchanged`]
      .concat(plan.cross_role.map((c) => `cross-role edit: ${c.path} (${c.owner})`)),
  },
  next: `ship it without rebuilding: /engineering-practices:deliver-package { wp: "<the package>", prior: <this result> }; with no work package, after the code reviewer passes, /engineering-practices:land-pr { pr: "${done.pr}" } (keeps the branch current, polls CI itself and squash-merges)`,
}
})(RUN.agent, RUN.phase, RUN.log)]); return RUN.finish(RUN_OUT)
