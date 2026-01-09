// lib/validators/svgo/create-link.schema.ts

import { z } from 'zod';

export const createLinkSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;



