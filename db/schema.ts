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
} from 'drizzle-orm/pg-core'

// —— Better Auth (PostgreSQL, text ids) ——
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

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

export const formResponsesRelations = relations(formResponses, ({ one }) => ({
  form: one(forms, { fields: [formResponses.formId], references: [forms.id] }),
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
  autoAction: 'approve' | null
  reasons: string[]
}

export type ShowcaseAiReviewPayload = {
  summary: string
  qualityScore: number
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
  action: 'approve'
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
    action: text('action').notNull().$type<'approve'>(),
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
