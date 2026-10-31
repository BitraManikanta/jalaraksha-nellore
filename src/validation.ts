import { z } from 'zod';
export const CATEGORIES = ['sewage','solid_waste','plastics','industrial','agricultural','oil_chemical','other'] as const;
const clean = (s: string) => s.replace(/[\u0000-\u001F\u007F<>]/g, ' ').replace(/\s+/g, ' ').trim();
const txt = (min: number, max: number) => z.string().transform(clean).pipe(z.string().min(min).max(max));
export const complaintSchema = z.object({
  category: z.enum(CATEGORIES),
  description: txt(20, 2000),
  observedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(d => new Date(d) <= new Date(), 'Date cannot be in the future'),
  locality: txt(2, 120),
  landmark: txt(0, 160).optional(),
  reporterName: txt(0, 80).optional(),
  reporterContact: txt(0, 120).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required' }) }),
  photo: z.string().max(3_000_000).optional(),   // data URL, about 2 MB max
  website: z.string().max(0).optional(),          // honeypot: bots fill it, humans never see it
});
export type ComplaintInput = z.infer<typeof complaintSchema>;
