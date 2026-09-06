export const CLOUD_AGENTS_URL = 'https://cursor.com/agents'

export const cloudAgentsPage = {
  title: 'Ship with Cursor Cloud Agents',
  eyebrow: 'Guides',
  description:
    'Cloud Agents work in isolated environments so you can keep coding, reviewing, or stepping away while a scoped change is implemented and opened as a pull request.',
} as const

export const cloudAgentWorkflow = [
  {
    step: 1,
    title: 'Choose a repository',
    summary:
      'Point the agent at the repo and branch it should work in, plus any environment notes it needs to boot cleanly.',
  },
  {
    step: 2,
    title: 'Give a scoped prompt',
    summary:
      'Describe the outcome, constraints, and what done looks like. Narrow scope beats a vague “make it better.”',
  },
  {
    step: 3,
    title: 'Review verification artifacts',
    summary:
      'Inspect the diff, tests, logs, and any screenshots the agent produced before you treat the work as ready.',
  },
  {
    step: 4,
    title: 'Merge the PR',
    summary:
      'Only merge after a human review. Cloud Agents open the pull request — they do not replace your judgment.',
  },
] as const

export const cloudAgentCapabilities = [
  {
    title: 'Work while you move on',
    detail:
      'Agents run in isolated cloud environments, so you can stay in your editor, join a meetup, or close the laptop.',
  },
  {
    title: 'Ship a scoped feature',
    detail:
      'Implement a user-visible change against an existing design system, routes, and tests — without inventing new infrastructure.',
  },
  {
    title: 'Fix a reproduced bug',
    detail:
      'Investigate a failing path, add a regression test, and keep the patch limited to the broken behavior.',
  },
  {
    title: 'Repair CI',
    detail:
      'Diagnose the first failing job, fix the root cause, and re-run lint, tests, and the production build.',
  },
  {
    title: 'Leave a reviewable PR',
    detail:
      'Expect a branch, a concise summary, and verification artifacts — not a silent commit on main.',
  },
  {
    title: 'Follow the repo you already have',
    detail:
      'Good prompts point at AGENTS.md, nearby components, and existing conventions instead of asking the agent to restyle the product.',
  },
] as const

export const cloudAgentSafetyChecks = [
  {
    title: 'Read the full diff',
    detail:
      'Skim every changed file. PR titles and summaries can hide migrations, refactors, or unrelated edits.',
  },
  {
    title: 'Confirm the tests are real',
    detail:
      'Check that new or updated tests cover the claimed behavior, then look at the actual command output.',
  },
  {
    title: 'Review permissions and access',
    detail:
      'Make sure the agent only used the repositories, environments, and integrations you intended to grant.',
  },
  {
    title: 'Hunt for secrets',
    detail:
      'Never paste production secrets into a prompt. Scan the diff for tokens, keys, connection strings, and hardcoded credentials.',
  },
  {
    title: 'Reject surprise infrastructure',
    detail:
      'New environment variables, database migrations, or extra dependencies should be explicit in the prompt — not a side effect.',
  },
  {
    title: 'Merge only after a human yes',
    detail:
      'Cloud Agents can open the pull request. A person still decides whether the change is safe to ship.',
  },
] as const

export const cloudAgentPromptTemplates = [
  {
    id: 'ship-feature',
    title: 'Ship a feature',
    useWhen: 'You know the user-visible outcome and want a focused implementation plus a reviewable PR.',
    prompt: `Ship a production-ready feature in this repository.

Goal
- [Describe the user-visible outcome and the route or surface it should live on.]

Scope
- Touch only the files needed for this feature.
- Do not add database migrations, new environment variables, or unnecessary dependencies unless I explicitly ask.
- Preserve existing routes and behavior.

Implementation
- First read AGENTS.md and match the existing design system, navigation, and nearby components.
- Follow current naming, file layout, and test conventions.

Verification
- Add or update the relevant tests.
- Run lint, the focused tests, and a production build for the affected surface.
- Include verification artifacts (command output, screenshots, or logs) in the PR.

When you are done, open a pull request. Do not merge it.`,
  },
  {
    id: 'fix-bug',
    title: 'Fix a bug',
    useWhen: 'You can describe the broken behavior and how to reproduce it.',
    prompt: `Fix this bug in an isolated environment.

Symptom
- [What the user sees today.]
- Reproduction: [URL, fixture, command, or click path.]

Expected
- [The correct behavior after the fix.]

Constraints
- Keep the change limited to the failing path.
- Do not refactor unrelated code or change public APIs.
- Preserve existing routes and behavior.

Verification
- Add a regression test that fails before the fix and passes after.
- Re-run the smallest relevant test command and capture the output.
- Inspect the diff for unintended edits.

Open a pull request with the repro, the root cause, and the evidence. Do not merge it.`,
  },
  {
    id: 'repair-ci',
    title: 'Repair CI',
    useWhen: 'A pipeline, lint run, or production build is red and you want the smallest safe fix.',
    prompt: `Repair CI on this branch without changing product behavior.

Failure
- Job or command: [name]
- Error excerpt: [paste the first real failure, not the whole log]

Approach
- Identify the first failing check and fix the root cause.
- Do not skip, quarantine, or weaken tests unless the test itself is wrong — and explain why.
- Keep the change set small. No drive-by refactors.

Verification
- Re-run the failing command locally.
- Confirm lint, tests, and the production build succeed.
- Summarize what broke, why, and how the fix was proven.

Open a pull request with the command output. Do not merge it.`,
  },
] as const

export function getCloudAgentPromptTemplate (id: string) {
  return cloudAgentPromptTemplates.find((template) => template.id === id) ?? null
}
