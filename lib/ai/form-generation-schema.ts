import { z } from 'zod'
import type { FormDefinition } from '@/lib/forms/types'

const generatedTextFieldSchema = z.object({
  type: z.enum(['short_text', 'long_text']),
  label: z.string().trim().min(1).max(160),
  required: z.boolean(),
  placeholder: z.string().trim().max(160).nullish(),
}).strict()

const generatedSelectFieldSchema = z.object({
  type: z.literal('select'),
  label: z.string().trim().min(1).max(160),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1).max(120)).min(1).max(12),
}).strict()

export const generatedFormDraftInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120),
  blocks: z.array(z.discriminatedUnion('type', [
    generatedTextFieldSchema,
    generatedSelectFieldSchema,
  ])).min(1).max(24),
}).strict()

export type GeneratedFormDraftInput = z.infer<typeof generatedFormDraftInputSchema>

const generatedFormDefinitionBlockSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string(),
    type: z.literal('short_text'),
    label: z.string(),
    required: z.boolean(),
    placeholder: z.string().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('long_text'),
    label: z.string(),
    required: z.boolean(),
    placeholder: z.string().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('select'),
    label: z.string(),
    required: z.boolean(),
    options: z.array(z.string()).min(1),
  }),
])

export const generatedFormDraftSchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120),
  definition: z.object({
    blocks: z.array(generatedFormDefinitionBlockSchema).min(1),
  }),
}).strict()

export type GeneratedFormDraft = {
  title: string
  slug: string
  definition: FormDefinition
}

export const generatedFormDraftJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'slug', 'blocks'],
  properties: {
    title: { type: 'string' },
    slug: { type: 'string' },
    blocks: {
      type: 'array',
      minItems: 1,
      maxItems: 24,
      items: {
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            required: ['type', 'label', 'required', 'placeholder'],
            properties: {
              type: { type: 'string', enum: ['short_text', 'long_text'] },
              label: { type: 'string' },
              required: { type: 'boolean' },
              placeholder: { type: ['string', 'null'] },
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            required: ['type', 'label', 'required', 'options'],
            properties: {
              type: { type: 'string', enum: ['select'] },
              label: { type: 'string' },
              required: { type: 'boolean' },
              options: {
                type: 'array',
                minItems: 1,
                maxItems: 12,
                items: { type: 'string' },
              },
            },
          },
        ],
      },
    },
  },
} as const
