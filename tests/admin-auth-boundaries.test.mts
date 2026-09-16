import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

const guardedAdminDataPages = [
  {
    path: 'app/admin/(dashboard)/page.tsx',
    firstProtectedRead: 'const [statsRows, recent, pendingAdminRows] = await Promise.all',
  },
  {
    path: 'app/admin/(dashboard)/credits/page.tsx',
    firstProtectedRead: 'const [providers, campaigns, allocations, guests, inventory, luma, metrics, claimCounts] = await Promise.all',
  },
  {
    path: 'app/admin/(dashboard)/forms/page.tsx',
    firstProtectedRead: 'const rows = await db.select().from(forms)',
  },
  {
    path: 'app/admin/(dashboard)/forms/[id]/page.tsx',
    firstProtectedRead: 'const rows = await db.select().from(forms)',
  },
  {
    path: 'app/admin/(dashboard)/responses/page.tsx',
    firstProtectedRead: 'const responses = await db',
  },
  {
    path: 'app/admin/(dashboard)/responses/[id]/page.tsx',
    firstProtectedRead: 'const rows = await db',
  },
  {
    path: 'app/admin/(dashboard)/gallery/page.tsx',
    firstProtectedRead: 'const [photoRows, videoRows] = await Promise.all',
  },
  {
    path: 'app/admin/(dashboard)/frame/page.tsx',
    firstProtectedRead: 'const settings = await getFrameCardSettings()',
  },
  {
    path: 'app/admin/(dashboard)/events/page.tsx',
    firstProtectedRead: 'const [',
  },
  {
    path: 'app/admin/(dashboard)/community-showcase/page.tsx',
    firstProtectedRead: 'let rows: Awaited<ReturnType<typeof getAllCommunityShowcaseForAdmin>> = []',
  },
  {
    path: 'app/admin/(dashboard)/testimonials/page.tsx',
    firstProtectedRead: 'const rows = await getAllTestimonialsForAdmin()',
  },
  {
    path: 'app/admin/(dashboard)/recaps/page.tsx',
    firstProtectedRead: 'const posts = await db.select',
  },
  {
    path: 'app/admin/(dashboard)/recaps/[id]/page.tsx',
    firstProtectedRead: 'const post = (await db.select()',
  },
]

test('admin data pages require approved admin access before protected reads', () => {
  for (const page of guardedAdminDataPages) {
    const source = readFileSync(path.join(root, page.path), 'utf8')
    const guardIndex = source.indexOf('await requireApprovedAdmin()')
    const readIndex = source.indexOf(page.firstProtectedRead)

    assert.notEqual(readIndex, -1, `${page.path} should include the protected read marker`)
    assert.notEqual(guardIndex, -1, `${page.path} should call requireApprovedAdmin()`)
    assert.ok(
      guardIndex < readIndex,
      `${page.path} should authenticate before reading protected admin data`
    )
  }
})
