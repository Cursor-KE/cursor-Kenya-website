import { z } from 'zod'

export const formBlockSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string(),
    type: z.literal('short_text'),
    label: z.string(),
    required: z.boolean().optional(),
    placeholder: z.string().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('long_text'),
    label: z.string(),
    required: z.boolean().optional(),
    placeholder: z.string().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('select'),
    label: z.string(),
    options: z.array(z.string()),
    required: z.boolean().optional(),
  }),
])

export type FormBlock = z.infer<typeof formBlockSchema>

export const formDefinitionSchema = z.object({
  blocks: z.array(formBlockSchema),
})

export type FormDefinition = z.infer<typeof formDefinitionSchema>
