// SPDX-License-Identifier: GPL-2.0-or-later
export const meta = {
  name: 'release-readiness',
  description: 'Before tagging a release: check every platform build, store, license, supply-chain and changelog area in parallel, prepare the changelog, release notes and docs in one place, and return go/no-go with the steps only the owner can take. args: { version: "X.Y.Z" (required), platforms?: ["<target>", ...], stores?: ["<store>", ...] }',
  phases: [
    { title: 'Plan', detail: 'confirm targets and stores from the project profile; list affected doc kinds with the Diataxis compass' },
    { title: 'Check', detail: 'one read-only agent per platform, store and compliance area' },
    { title: 'Docs', detail: 'one agent writes the changelog, release notes and doc pages' },
    { title: 'Docs check', detail: 'verify each touched page holds one Diataxis kind' },
    { title: 'Go/no-go', detail: 'blockers, unverified areas, owner-only actions' },
  ],
}

const USAGE = 'usage: release-readiness { version: "X.Y.Z", platforms?: ["<target>", ...], stores?: ["<store>", ...] }'
const version = args && typeof args.version === 'string' ? args.version.replace(/^v/, '') : ''
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) return `missing or invalid version (SemVer X.Y.Z). ${USAGE}`

const DOCS_FRAGMENT = 'Classify every user-visible change in this work with the Diataxis compass (action/cognition x study/work). For each, update or add exactly one page of that kind under docs/<kind>/, keep each page to one kind, title it by the project pattern, and link to the related pages of the other kinds. Report pages touched and any change you left undocumented and why.'

const PLAN = { type: 'object', properties: {
  platforms: { type: 'array', items: { type: 'string' } },
  stores: { type: 'array', items: { type: 'string' } },
  previous_tag: { type: 'string' },
  docs: { type: 'array', items: { type: 'object', properties: {
    kind: { type: 'string', enum: ['tutorial', 'how-to', 'reference', 'explanation'] },
    page: { type: 'string' }, reason: { type: 'string' } }, required: ['kind', 'page', 'reason'] } },
}, required: ['platforms', 'stores', 'docs'] }

const AREA = { type: 'object', properties: {
  status: { type: 'string', enum: ['pass', 'fail'] },
  blockers: { type: 'array', items: { type: 'string' } },
  owner_actions: { type: 'array', items: { type: 'string' } },
  evidence: { type: 'array', items: { type: 'string' } },
  proposed_text: { type: 'string' },
}, required: ['status', 'blockers', 'evidence'] }

const DOCCHECK = { type: 'object', properties: {
  problems: { type: 'array', items: { type: 'string' } },
  pages_checked: { type: 'array', items: { type: 'string' } },
}, required: ['problems', 'pages_checked'] }

phase('Plan')
const plan = await agent(
  `Release ${version} readiness, planning only (write nothing). Follow the devops-engineer release-management skill.
Read the project's CLAUDE.md and profile. Confirm the release targets (requested: ${JSON.stringify((args && args.platforms) || [])}) and stores (requested: ${JSON.stringify((args && args.stores) || [])}); if a list is empty, take it from the profile. Find the previous release tag.
Then list which project doc pages this release affects, classified with the Diataxis compass: at least the CHANGELOG (reference) and release notes (reference); add a how-to if users must do something new (upgrade steps), reference if a public API, format or store sheet changed, explanation if a release-model decision was made.`,
  { schema: PLAN, phase: 'Plan', label: 'plan' })
if (!plan) return 'planning failed: no plan returned; nothing was checked'

const areas = [
  ...plan.platforms.map(p => [`build:${p}`, `Check the ${p} build for ${version}: the default branch commit to be tagged is green for ${p} in CI, built from a clean checkout with pinned toolchain and verified downloads, artifact named and checksummed, smoke test passed (cross-platform-builds and ci-pipelines skills). Link the CI run and digest as evidence.`]),
  ...plan.stores.map(s => [`store:${s}`, `Check the store sheet for ${s} against the store's current guidelines for ${version}: identifiers, build requirements, signing set up and verified in CI, metadata and screenshots complete, rating and privacy declarations current, rejection risks (store-distribution skill). List every step only the owner can take, with exact instructions; never act in the owner's name.`]),
  ['licenses', `Check license compliance for ${version}: REUSE lint green; every file the project created carries the project license; every dependency and asset has a known, compatible license; the notices bundle is generated from the SBOM and the single credits source; for copyleft duties, the complete corresponding source for this exact version will be attached and linked (license-compliance skill).`],
  ['supply-chain', `Check supply-chain readiness for ${version}: dependencies and pipeline steps pinned, no unverified downloads, known-vulnerability scan clean or exceptions written, SBOM and signed provenance produced by the release stage and verified before publish (supply-chain-security skill).`],
  ['changelog', `Compute the version bump from Conventional Commits since ${plan.previous_tag || 'the previous tag'} and check that ${version} matches it and the declared public API (release-management skill). Draft the CHANGELOG entry and plain-language release notes and return them in proposed_text. Do not edit any file.`],
]

phase('Check')
const results = await pipeline(areas, ([area, task]) =>
  agent(`${task}\nRead-only: do not edit, commit or push anything; return findings only.`, { schema: AREA, phase: 'Check', label: area })
    .then(r => r ? { area, ...r } : { area, status: 'unverified', blockers: [`${area}: checker returned nothing; area unverified`], evidence: [] }))

phase('Docs')
const changelog = results.find(r => r.area === 'changelog')
const docs = await agent(
  `Release ${version}: on a branch named docs/release-${version}, write the release documentation in the project's docs, as the only agent editing these files.
Pages planned: ${JSON.stringify(plan.docs)}
Changelog and notes draft: ${(changelog && changelog.proposed_text) || '(none; generate from Conventional Commits following the release-management skill)'}
Owner actions to document as a how-to if they are recurring: ${JSON.stringify(results.flatMap(r => r.owner_actions || []))}
${DOCS_FRAGMENT}
Commit with Conventional Commits (docs: ...), push, and open or update a draft PR. Return the PR URL and pages touched.`,
  { phase: 'Docs', label: 'docs' })

phase('Docs check')
const dc = await agent(
  `Review the release ${version} documentation PR (branch docs/release-${version}) against the Diataxis review checklist: each changed page is one kind; how-to titles name a user goal and explanation titles read "About ..."; reference matches its siblings' format; changelog entry matches the commits; links connect the kinds. Report problems only where you can point to the page and line.`,
  { schema: DOCCHECK, phase: 'Docs check', label: 'docs-check' })

phase('Go/no-go')
const blockers = results.flatMap(r => (r.blockers && r.blockers.length) ? r.blockers.map(b => `${r.area}: ${b}`) : (r.status === 'fail' ? [`${r.area}: check failed without listing blockers`] : []))
if (!docs) blockers.push('docs: documentation agent returned nothing')
if (!dc) blockers.push('docs: documentation check did not run; docs unverified')
else blockers.push(...dc.problems.map(p => `docs: ${p}`))
const unverified = results.filter(r => r.status === 'unverified').map(r => r.area)
const owner_actions = results.flatMap(r => (r.owner_actions || []).map(a => `${r.area}: ${a}`))

return {
  version,
  decision: blockers.length ? 'no-go' : 'go',
  blockers,
  unverified,
  owner_actions,
  evidence: results.map(r => ({ area: r.area, status: r.status, evidence: r.evidence })),
  docs_pr: docs || null,
  next: blockers.length
    ? 'Fix the blockers (or get written owner acceptance) and run release-readiness again.'
    : `Ready: once the release is approved per the project's release process, tag v${version} on the checked commit; the release stage promotes, signs and publishes.`,
}
