export const meta = {
  name: 'release-readiness',
  description: 'Check every platform build, license notices and store requirements in parallel before a release',
  whenToUse: 'Before tagging a release. args: { version: "vX.Y.Z", platforms: ["<platform>", ...], stores: ["<store>", ...] }',
  phases: [{ title: 'Check', detail: 'one agent per platform, store and compliance area' }, { title: 'Go/no-go', detail: 'blockers and owner actions' }],
}
const version = (args && args.version) || 'the next version'
const platforms = (args && args.platforms) || []
const stores = (args && args.stores) || []
const R = { type: 'object', properties: { area: { type: 'string' }, blockers: { type: 'array', items: { type: 'string' } },
  owner_actions: { type: 'array', items: { type: 'string' } } }, required: ['area', 'blockers'] }
const areas = [
  ...platforms.map(p => [`build:${p}`, `Confirm the ${p} build for ${version} succeeds in CI with pinned toolchains and produces a runnable artifact (cross-platform-builds skill).`]),
  ...stores.map(s => [`store:${s}`, `Check the ${s} checklist for ${version}: identifiers, signing, metadata, screenshots, rating, privacy, guideline risks (store-distribution skill). List anything only the owner can do.`]),
  ['licenses', `Check every dependency and asset has its notice shipped in-app and in the release, and the project license's duties are met for ${version} (license-compliance skill).`],
  ['changelog', `Generate the changelog and version for ${version} from Conventional Commits and check it reads well for players (release-management skill).`],
]
const res = await pipeline(areas, ([area, task]) => agent(task, { schema: R, phase: 'Check', label: area }).then(r => r && { ...r, area }))
phase('Go/no-go')
return await agent(`Decide go or no-go for ${version} from:\n${JSON.stringify(res.filter(Boolean))}\nList blockers with owners, and a separate list of steps only the project owner can take (accounts, keys, agreements), with exact instructions.`, { label: 'decision' })
