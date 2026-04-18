'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { user } from '@/db/schema'
import { requireSuperUser } from '@/lib/auth/session'

async function revalidateAdminUserViews () {
  revalidatePath('/admin')
  revalidatePath('/admin/users')
  revalidatePath('/admin/pending')
}

async function getTargetUser (userId: string) {
  const rows = await db.select().from(user).where(eq(user.id, userId)).limit(1)
  return rows[0] ?? null
}

export async function approveAdminUser (userId: string) {
  const currentUser = await requireSuperUser()
  const targetUser = await getTargetUser(userId)

  if (!targetUser || targetUser.role === 'super_user') return

  await db
    .update(user)
    .set({
      role: 'admin',
      adminStatus: 'approved',
      approvedByUserId: currentUser.user.id,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))

  await revalidateAdminUserViews()
}

export async function rejectAdminUser (userId: string) {
  await requireSuperUser()
  const targetUser = await getTargetUser(userId)

  if (!targetUser || targetUser.role === 'super_user') return

  await db
    .update(user)
    .set({
      adminStatus: 'rejected',
      approvedByUserId: null,
      approvedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))

  await revalidateAdminUserViews()
}
