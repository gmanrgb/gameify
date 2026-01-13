import { z } from 'zod';

export const ThemeSchema = z.enum(['aurora', 'sunset', 'ocean', 'midnight']);
export type Theme = z.infer<typeof ThemeSchema>;

export const ProfileSchema = z.object({
  userId: z.string().uuid().optional(),
  displayName: z.string().max(30).optional(),
  xpTotal: z.number().int().min(0).default(0),
  level: z.number().int().min(1).default(1),
  perfectDays: z.number().int().min(0).default(0),
  theme: ThemeSchema.default('aurora'),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#7C3AED'),
  createdAt: z.string().datetime().optional(),
});

export type Profile = z.infer<typeof ProfileSchema>;

export const UpdateProfileSchema = z.object({
  theme: ThemeSchema.optional(),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
