import { db, businessUsers, businesses } from '@/db'
import { eq, and } from 'drizzle-orm'
import { getCurrentUser } from './simple-auth'

// Re-export client-safe utilities
export { isOwner, canManageBusiness } from './business-role'
import type { BusinessRole } from './business-role'
export type { BusinessRole }

export interface BusinessAccess {
  businessId: string
  businessName: string
  role: BusinessRole
  userId: string
}

/**
 * Validate that a user has access to a specific business.
 * Returns the user's role and business info, or null if no access.
 */
export async function validateBusinessAccess(
  userId: string,
  businessId: string
): Promise<BusinessAccess | null> {
  const membership = await db
    .select({
      businessId: businessUsers.businessId,
      role: businessUsers.role,
      status: businessUsers.status,
      businessName: businesses.name,
    })
    .from(businessUsers)
    .innerJoin(businesses, eq(businessUsers.businessId, businesses.id))
    .where(
      and(
        eq(businessUsers.userId, userId),
        eq(businessUsers.businessId, businessId),
        eq(businessUsers.status, 'active')
      )
    )
    .get()

  if (!membership) {
    return null
  }

  return {
    businessId: membership.businessId,
    businessName: membership.businessName,
    role: membership.role as BusinessRole,
    userId,
  }
}

/**
 * Get business access from current session and businessId.
 * Convenience wrapper that combines getCurrentUser + validateBusinessAccess.
 * Returns null if not authenticated or no access.
 */
export async function getBusinessAccess(
  businessId: string
): Promise<BusinessAccess | null> {
  const session = await getCurrentUser()
  if (!session) {
    return null
  }

  return validateBusinessAccess(session.userId, businessId)
}

/**
 * Require business access - throws if not authenticated or no access.
 * Use in API routes that need business context.
 */
export async function requireBusinessAccess(
  businessId: string
): Promise<BusinessAccess> {
  const access = await getBusinessAccess(businessId)
  if (!access) {
    throw new Error('Unauthorized: No access to this business')
  }
  return access
}
