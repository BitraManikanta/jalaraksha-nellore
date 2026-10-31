import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
const s = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(160),
  message: z.string().trim().min(10).max(2000), website: z.string().max(0).optional() });
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const p = s.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Please check your name, email and message.' });
  if (p.data.website) return res.json({ ok: true });
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'Service is not configured yet.' });
  const { error } = await createClient(url, key, { auth: { persistSession: false } })
    .from('contact_messages').insert({ name: p.data.name, email: p.data.email, message: p.data.message });
  return error ? res.status(500).json({ error: 'Could not save your message.' }) : res.status(201).json({ ok: true });
}
