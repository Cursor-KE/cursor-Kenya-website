import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CLOUD_AGENTS_URL,
  cloudAgentCapabilities,
  cloudAgentPromptTemplates,
  cloudAgentSafetyChecks,
  cloudAgentWorkflow,
  cloudAgentsPage,
  getCloudAgentPromptTemplate,
} from '../lib/guides/cloud-agents.ts'
import {
  marketingFooterLinks,
  marketingNavLinks,
  withOptionalFrameLink,
} from '../lib/marketing/nav.ts'

test('cloud agents guide keeps the public page title and isolated-environment framing', () => {
  assert.equal(cloudAgentsPage.title, 'Ship with Cursor Cloud Agents')
  assert.match(cloudAgentsPage.description, /isolated environments/i)
  assert.equal(CLOUD_AGENTS_URL, 'https://cursor.com/agents')
})

test('workflow is four reviewable steps ending in a human merge', () => {
  assert.equal(cloudAgentWorkflow.length, 4)
  assert.deepEqual(cloudAgentWorkflow.map((item) => item.title), [
    'Choose a repository',
    'Give a scoped prompt',
    'Review verification artifacts',
    'Merge the PR',
  ])
  assert.match(cloudAgentWorkflow[3].summary, /human review/i)
})

test('prompt templates cover feature, bug, and CI work and stay copyable', () => {
  assert.deepEqual(cloudAgentPromptTemplates.map((item) => item.id), [
    'ship-feature',
    'fix-bug',
    'repair-ci',
  ])

  for (const template of cloudAgentPromptTemplates) {
    assert.ok(template.prompt.includes('[') && template.prompt.includes(']'))
    assert.match(template.prompt, /pull request/i)
    assert.ok(template.prompt.length > 200)
  }

  assert.equal(getCloudAgentPromptTemplate('repair-ci')?.title, 'Repair CI')
  assert.equal(getCloudAgentPromptTemplate('missing'), null)
})

test('capabilities and safety checklist mention diffs, tests, permissions, and secrets', () => {
  assert.ok(cloudAgentCapabilities.length >= 4)
  assert.ok(cloudAgentCapabilities.some((item) => /isolated/i.test(item.detail)))

  const checklist = cloudAgentSafetyChecks.map((item) => `${item.title} ${item.detail}`).join(' ')
  assert.match(checklist, /diff/i)
  assert.match(checklist, /tests/i)
  assert.match(checklist, /permissions/i)
  assert.match(checklist, /secrets/i)
})

test('public navigation and footer include Cloud Agents without dropping existing routes', () => {
  const labels = marketingNavLinks.map((link) => link.label)
  const hrefs = marketingNavLinks.map((link) => link.href)

  assert.deepEqual(labels, [
    'Home',
    'Events',
    'Recaps',
    'Gallery',
    'Showcase',
    'Cloud Agents',
    'About',
  ])
  assert.ok(hrefs.includes('/guides/cloud-agents'))
  assert.ok(marketingFooterLinks.some((link) => link.href === '/guides/cloud-agents'))
  assert.ok(!marketingFooterLinks.some((link) => link.href === '/'))

  const withFrame = withOptionalFrameLink(marketingNavLinks, true)
  assert.equal(withFrame[2]?.href, '/getyourcard')
  assert.ok(withFrame.some((link) => link.href === '/guides/cloud-agents'))
  assert.deepEqual(
    withOptionalFrameLink(marketingNavLinks, false).map((link) => link.href),
    hrefs
  )
})
