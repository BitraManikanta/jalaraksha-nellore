import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { z } from 'zod';
const q = z.object({ referenceNo: z.string().regex(/^JR-\d{4}-\d{6}$/), pin: z.string().regex(/^\d{6}$/) });
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const p = q.safeParse(req.body);
  const notFound = () => res.status(404).json({ error: 'No report matches that reference number and PIN.' });
  if (!p.success) return notFound();
  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const hash = createHash('sha256').update(p.data.pin + (process.env.HASH_SECRET ?? '')).digest('hex');
  const { data } = await db.from('complaints').select('reference_no,status,category,locality,created_at,updated_at,email_status')
    .eq('reference_no', p.data.referenceNo).eq('pin_hash', hash).maybeSingle();
  return data ? res.json(data) : notFound(); // same answer for wrong ref or wrong PIN
}
