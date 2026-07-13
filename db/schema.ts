import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// —— Better Auth (PostgreSQL, text ids) ——
export const adminRoleEnum = pgEnum('admin_role', ['super_user', 'admin'])
export const adminStatusEnum = pgEnum('admin_status', ['pending', 'approved', 'rejected'])

export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    role: adminRoleEnum('role').notNull().default('admin'),
    adminStatus: adminStatusEnum('admin_status').notNull().default('pending'),
    approvedByUserId: text('approved_by_user_id'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('user_role_idx').on(table.role),
    index('user_admin_status_idx').on(table.adminStatus),
  ]
)

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_userId_idx').on(table.userId)]
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('account_userId_idx').on(table.userId)]
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)]
)

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}))

// —— App tables ——
export const images = pgTable(
  'images',
  {
    id: text('id').primaryKey(),
    publicId: text('public_id').notNull(),
    secureUrl: text('secure_url').notNull(),
    alt: text('alt').default(''),
    width: integer('width'),
    height: integer('height'),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('images_sort_order_idx').on(t.sortOrder)]
)

export const videos = pgTable(
  'videos',
  {
    id: text('id').primaryKey(),
    youtubeVideoId: text('youtube_video_id').notNull(),
    title: text('title'),
    description: text('description'),
    featured: boolean('featured').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('videos_sort_order_idx').on(t.sortOrder)]
)

export const lumaEvents = pgTable(
  'luma_events',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }),
    url: text('url').notNull(),
    coverUrl: text('cover_url'),
    status: text('status').notNull().default('active').$type<'active' | 'canceled'>(),
    rawPayload: jsonb('raw_payload').notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index('luma_events_start_at_idx').on(t.startAt),
    index('luma_events_status_idx').on(t.status),
  ]
)

export const lumaWebhookDeliveries = pgTable(
  'luma_webhook_deliveries',
  {
    id: text('id').primaryKey(),
    eventType: text('event_type').notNull(),
    lumaObjectId: text('luma_object_id'),
    payload: jsonb('payload').notNull().$type<Record<string, unknown>>(),
    status: text('status').notNull().default('processing').$type<'processing' | 'processed' | 'ignored' | 'failed'>(),
    error: text('error'),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (t) => [
    index('luma_webhook_deliveries_event_type_idx').on(t.eventType),
    index('luma_webhook_deliveries_object_idx').on(t.lumaObjectId),
    index('luma_webhook_deliveries_received_at_idx').on(t.receivedAt),
  ]
)

export const lumaGuests = pgTable(
  'luma_guests',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id').notNull(),
    userId: text('user_id'),
    email: text('email'),
    name: text('name'),
    firstName: text('first_name'),
    lastName: text('last_name'),
    approvalStatus: text('approval_status'),
    phoneNumber: text('phone_number'),
    registeredAt: timestamp('registered_at', { withTimezone: true }),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    rawPayload: jsonb('raw_payload').notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index('luma_guests_event_id_idx').on(t.eventId),
    index('luma_guests_email_idx').on(t.email),
    index('luma_guests_approval_status_idx').on(t.approvalStatus),
    index('luma_guests_registered_at_idx').on(t.registeredAt),
  ]
)

export const lumaTickets = pgTable(
  'luma_tickets',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id').notNull(),
    guestId: text('guest_id'),
    ticketTypeId: text('ticket_type_id'),
    name: text('name'),
    amount: integer('amount'),
    currency: text('currency'),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    rawPayload: jsonb('raw_payload').notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index('luma_tickets_event_id_idx').on(t.eventId),
    index('luma_tickets_guest_id_idx').on(t.guestId),
    index('luma_tickets_checked_in_at_idx').on(t.checkedInAt),
  ]
)

export const frameCardSettings = pgTable('frame_card_settings', {
  id: text('id').primaryKey().default('default'),
  title: text('title').notNull().default('/Nairobi Meetup'),
  published: boolean('published').default(false).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const formStatusEnum = pgEnum('form_status', ['draft', 'published'])

export const forms = pgTable(
  'forms',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    status: formStatusEnum('status').notNull().default('draft'),
    definition: jsonb('definition').notNull().$type<unknown>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index('forms_slug_idx').on(t.slug)]
)

export const formResponses = pgTable(
  'form_responses',
  {
    id: text('id').primaryKey(),
    formId: text('form_id')
      .notNull()
      .references(() => forms.id, { onDelete: 'cascade' }),
    answers: jsonb('answers').notNull().$type<Record<string, unknown>>(),
    submitterMeta: jsonb('submitter_meta').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('form_responses_form_id_idx').on(t.formId)]
)

export const formsRelations = relations(forms, ({ many }) => ({
  responses: many(formResponses),
}))

export const formResponsesRelations = relations(formResponses, ({ one, many }) => ({
  form: one(forms, { fields: [formResponses.formId], references: [forms.id] }),
  testimonials: many(testimonials),
}))

export const testimonials = pgTable(
  'testimonials',
  {
    id: text('id').primaryKey(),
    formId: text('form_id').references(() => forms.id, { onDelete: 'set null' }),
    responseId: text('response_id').references(() => formResponses.id, { onDelete: 'set null' }),
    blockId: text('block_id'),
    question: text('question'),
    quote: text('quote').notNull(),
    attendeeName: text('attendee_name'),
    attendeeRole: text('attendee_role'),
    published: boolean('published').default(true).notNull(),
    featured: boolean('featured').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index('testimonials_published_idx').on(t.published),
    index('testimonials_featured_sort_idx').on(t.featured, t.sortOrder),
    index('testimonials_response_block_idx').on(t.responseId, t.blockId),
  ]
)

export const testimonialsRelations = relations(testimonials, ({ one }) => ({
  form: one(forms, { fields: [testimonials.formId], references: [forms.id] }),
  response: one(formResponses, { fields: [testimonials.responseId], references: [formResponses.id] }),
}))

export const showcaseStatusEnum = pgEnum('showcase_status', ['pending', 'approved', 'rejected'])

export const communityShowcase = pgTable(
  'community_showcase',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    projectUrl: text('project_url').notNull(),
    repoUrl: text('repo_url'),
    builderName: text('builder_name').notNull(),
    builderEmail: text('builder_email').notNull(),
    screenshotUrls: jsonb('screenshot_urls').notNull().$type<string[]>(),
    projectKind: text('project_kind').notNull().default('other'),
    status: showcaseStatusEnum('status').notNull().default('pending'),
    featured: boolean('featured').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index('community_showcase_status_idx').on(t.status),
    index('community_showcase_featured_sort_idx').on(t.featured, t.sortOrder),
  ]
)

export type ShowcaseValidationSignals = {
  titleLengthOk: boolean
  descriptionLengthOk: boolean
  descriptionWordCountOk: boolean
  builderNameLengthOk: boolean
  projectUrlOk: boolean
  repoUrlOk: boolean
  screenshotCountOk: boolean
  duplicateScreenshots: boolean
}

export type ShowcaseReviewPolicyOutcome = {
  decisionMode: 'manual_review' | 'auto_approved'
  autoAction: 'approve_and_feature' | null
  reasons: string[]
}

export type ShowcaseAiReviewPayload = {
  summary: string
  projectOverview: string
  featureHighlights: string[]
  repositoryUrl: string
  qualityScore: number
  scoreRationale: string
  recommendation: 'approve' | 'reject' | 'needs_manual_review'
  featuredSuggestion: {
    shouldFeature: boolean
    reason: string
  }
  riskFlags: string[]
  moderationNotes: string
}

export const showcaseAiReviews = pgTable(
  'showcase_ai_reviews',
  {
    id: text('id').primaryKey(),
    showcaseId: text('showcase_id')
      .notNull()
      .references(() => communityShowcase.id, { onDelete: 'cascade' }),
    statusAtReview: showcaseStatusEnum('status_at_review').notNull(),
    promptVersion: text('prompt_version').notNull(),
    model: text('model').notNull(),
    validationSignals: jsonb('validation_signals').notNull().$type<ShowcaseValidationSignals>(),
    reviewJson: jsonb('review_json').notNull().$type<ShowcaseAiReviewPayload>(),
    policyOutcome: jsonb('policy_outcome').notNull().$type<ShowcaseReviewPolicyOutcome>(),
    createdByUserId: text('created_by_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('showcase_ai_reviews_showcase_id_idx').on(t.showcaseId),
    index('showcase_ai_reviews_created_at_idx').on(t.createdAt),
  ]
)

export type ShowcaseAiActionPayload = {
  id: string
  showcaseId: string
  reviewId: string
  action: 'approve_and_feature'
  actionSource: 'ai_auto_action'
  policySnapshot: ShowcaseReviewPolicyOutcome
  executedByUserId: string | null
  executedAt: Date
  success: boolean
  failureReason: string | null
  preActionStatus: 'pending' | 'approved' | 'rejected'
  postActionStatus: 'pending' | 'approved' | 'rejected' | null
}

export const showcaseAiActions = pgTable(
  'showcase_ai_actions',
  {
    id: text('id').primaryKey(),
    showcaseId: text('showcase_id')
      .notNull()
      .references(() => communityShowcase.id, { onDelete: 'cascade' }),
    reviewId: text('review_id')
      .notNull()
      .references(() => showcaseAiReviews.id, { onDelete: 'cascade' }),
    action: text('action').notNull().$type<'approve_and_feature'>(),
    actionSource: text('action_source').notNull().$type<'ai_auto_action'>(),
    policySnapshot: jsonb('policy_snapshot').notNull().$type<ShowcaseReviewPolicyOutcome>(),
    executedByUserId: text('executed_by_user_id'),
    executedAt: timestamp('executed_at', { withTimezone: true }).defaultNow().notNull(),
    success: boolean('success').notNull(),
    failureReason: text('failure_reason'),
    preActionStatus: showcaseStatusEnum('pre_action_status').notNull(),
    postActionStatus: showcaseStatusEnum('post_action_status'),
  },
  (t) => [
    index('showcase_ai_actions_showcase_id_idx').on(t.showcaseId),
    index('showcase_ai_actions_review_id_idx').on(t.reviewId),
  ]
)

// —— Credit distribution ——
export const creditProviderStatusEnum = pgEnum('credit_provider_status', ['active', 'archived'])
export const creditCampaignStatusEnum = pgEnum('credit_campaign_status', ['draft', 'active', 'paused', 'ended', 'archived'])
export const creditGuestStatusEnum = pgEnum('credit_guest_status', ['eligible', 'removed'])
export const creditInventoryStatusEnum = pgEnum('credit_inventory_status', ['available', 'claimed', 'revoked'])
export const creditImportKindEnum = pgEnum('credit_import_kind', ['guests', 'inventory', 'luma_guests'])

export const creditProviders = pgTable('credit_providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  status: creditProviderStatusEnum('status').notNull().default('active'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [index('credit_providers_status_idx').on(t.status)])

export const creditCampaigns = pgTable('credit_campaigns', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  status: creditCampaignStatusEnum('status').notNull().default('draft'),
  claimStartsAt: timestamp('claim_starts_at', { withTimezone: true }),
  claimEndsAt: timestamp('claim_ends_at', { withTimezone: true }),
  lumaEventId: text('luma_event_id').references(() => lumaEvents.id, { onDelete: 'restrict' }),
  createdByUserId: text('created_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('credit_campaigns_status_idx').on(t.status),
  index('credit_campaigns_luma_event_idx').on(t.lumaEventId),
])

export const creditCampaignProviders = pgTable('credit_campaign_providers', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => creditCampaigns.id, { onDelete: 'restrict' }),
  providerId: text('provider_id').notNull().references(() => creditProviders.id, { onDelete: 'restrict' }),
  active: boolean('active').notNull().default(true),
  publicInstructions: text('public_instructions'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  uniqueIndex('credit_campaign_provider_unique').on(t.campaignId, t.providerId),
  index('credit_campaign_providers_campaign_idx').on(t.campaignId),
])

export const creditGuests = pgTable('credit_guests', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => creditCampaigns.id, { onDelete: 'restrict' }),
  email: text('email').notNull(),
  normalizedEmail: text('normalized_email').notNull(),
  name: text('name'),
  externalId: text('external_id'),
  eligibilityStatus: creditGuestStatusEnum('eligibility_status').notNull().default('eligible'),
  source: text('source').notNull().default('manual').$type<'manual' | 'csv' | 'luma'>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  uniqueIndex('credit_guest_campaign_email_unique').on(t.campaignId, t.normalizedEmail),
  index('credit_guests_campaign_status_idx').on(t.campaignId, t.eligibilityStatus),
])

export const creditInventory = pgTable('credit_inventory', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull().references(() => creditProviders.id, { onDelete: 'restrict' }),
  campaignProviderId: text('campaign_provider_id').references(() => creditCampaignProviders.id, { onDelete: 'restrict' }),
  fingerprint: text('fingerprint').notNull().unique(),
  encryptedValue: text('encrypted_value').notNull(),
  maskedValue: text('masked_value').notNull(),
  label: text('label'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  status: creditInventoryStatusEnum('status').notNull().default('available'),
  createdByUserId: text('created_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('credit_inventory_allocation_status_idx').on(t.campaignProviderId, t.status),
  index('credit_inventory_provider_idx').on(t.providerId),
])

export const creditClaims = pgTable('credit_claims', {
  id: text('id').primaryKey(),
  campaignProviderId: text('campaign_provider_id').notNull().references(() => creditCampaignProviders.id, { onDelete: 'restrict' }),
  guestId: text('guest_id').notNull().references(() => creditGuests.id, { onDelete: 'restrict' }),
  inventoryId: text('inventory_id').notNull().references(() => creditInventory.id, { onDelete: 'restrict' }),
  claimedAt: timestamp('claimed_at', { withTimezone: true }).defaultNow().notNull(),
  redeemedAt: timestamp('redeemed_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('credit_claim_inventory_unique').on(t.inventoryId),
  uniqueIndex('credit_claim_guest_allocation_unique').on(t.campaignProviderId, t.guestId),
  index('credit_claims_claimed_at_idx').on(t.claimedAt),
])

export const creditImports = pgTable('credit_imports', {
  id: text('id').primaryKey(),
  kind: creditImportKindEnum('kind').notNull(),
  campaignId: text('campaign_id').references(() => creditCampaigns.id, { onDelete: 'restrict' }),
  providerId: text('provider_id').references(() => creditProviders.id, { onDelete: 'restrict' }),
  campaignProviderId: text('campaign_provider_id').references(() => creditCampaignProviders.id, { onDelete: 'restrict' }),
  createdByUserId: text('created_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  summary: jsonb('summary').notNull().$type<{ created: number; skipped: number; invalid: number; duplicates: number }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const creditAuditLog = pgTable('credit_audit_log', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  metadata: jsonb('metadata').notNull().default({}).$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('credit_audit_entity_idx').on(t.entityType, t.entityId),
  index('credit_audit_created_at_idx').on(t.createdAt),
])

export const creditVerifications = pgTable('credit_verifications', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => creditCampaigns.id, { onDelete: 'cascade' }),
  normalizedEmail: text('normalized_email').notNull(),
  codeHash: text('code_hash').notNull(),
  ipHash: text('ip_hash').notNull(),
  attempts: integer('attempts').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('credit_verification_email_created_idx').on(t.campaignId, t.normalizedEmail, t.createdAt),
  index('credit_verification_ip_created_idx').on(t.ipHash, t.createdAt),
])
