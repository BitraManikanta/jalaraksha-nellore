import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { complaintSchema } from '../src/validation';

const sha = (v: string) => createHash('sha256').update(v + (process.env.HASH_SECRET ?? '')).digest('hex');
const MAGIC: Record<string, [string, number[]]> = {
  'image/jpeg': ['jpg', [0xff, 0xd8, 0xff]], 'image/png': ['png', [0x89, 0x50, 0x4e, 0x47]], 'image/webp': ['webp', [0x52, 0x49, 0x46, 0x46]],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(503).json({ error: 'Service is not configured yet.' });

  const parsed = complaintSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors });
  const d = parsed.data;
  if (d.website) return res.status(200).json({ ok: true }); // silently drop bots

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const ipHash = sha(String(req.headers['x-forwarded-for'] ?? 'unknown').split(',')[0].trim());

  // Rate limit: max 5 reports per IP per hour (stored in the database, so it survives serverless restarts)
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db.from('complaints').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since);
  if ((count ?? 0) >= 5) return res.status(429).json({ error: 'Too many reports from this connection. Please try again later.' });

  // Optional photo: check type by file signature, not by what the browser claims
  let photoPath: string | null = null;
  let photoBuf: Buffer | null = null, ext = '', mime = '';
  if (d.photo) {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(d.photo);
    if (!m) return res.status(400).json({ error: 'Photo must be a JPG, PNG or WebP image.' });
    photoBuf = Buffer.from(m[2], 'base64'); mime = m[1]; const [e, sig] = MAGIC[mime]; ext = e;
    if (photoBuf.length > 2 * 1024 * 1024 || !sig.every((b, i) => photoBuf![i] === b))
      return res.status(400).json({ error: 'Photo is too large (max 2 MB) or not a valid image.' });
    photoPath = `${randomUUID()}.${ext}`;
  }

  const pin = String(randomInt(100000, 999999));
  const { data: row, error } = await db.from('complaints').insert({
    pin_hash: sha(pin), category: d.category, description: d.description, observed_on: d.observedOn,
    locality: d.locality, landmark: d.landmark || null, reporter_name: d.reporterName || null,
    reporter_contact: d.reporterContact || null, consent_given: true, photo_path: photoPath, ip_hash: ipHash,
    email_status: process.env.MUNICIPAL_EMAIL_TO && process.env.RESEND_API_KEY ? 'pending' : 'not_configured',
  }).select('id, reference_no, email_status').single();
  if (error || !row) { console.error('insert failed', error?.code); return res.status(500).json({ error: 'Could not save your report. Nothing was submitted. Please try again.' }); }

  if (photoBuf && photoPath) {
    const up = await db.storage.from('complaint-photos').upload(photoPath, photoBuf, { contentType: mime });
    if (up.error) { await db.from('complaints').update({ photo_path: null }).eq('id', row.id); photoPath = null; }
  }

  let emailStatus = row.email_status as string;
  if (emailStatus === 'pending') {
    try {
      const r = await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.EMAIL_FROM!, to: process.env.MUNICIPAL_EMAIL_TO!.split(',').map(s => s.trim()),
        subject: `[JalaRaksha] Water pollution report ${row.reference_no} - ${d.locality}`,
        text: `Independent student portal (not an official municipal system).\nRef: ${row.reference_no}\nCategory: ${d.category}\nLocality: ${d.locality}\nLandmark: ${d.landmark ?? '-'}\nObserved: ${d.observedOn}\n\n${d.description}\n\nReporter contact: ${d.reporterContact ?? 'not provided'}`,
      });
      emailStatus = r.error ? 'failed' : 'sent';
    } catch { emailStatus = 'failed'; }
    await db.from('complaints').update({ email_status: emailStatus, emailed_at: emailStatus === 'sent' ? new Date().toISOString() : null }).eq('id', row.id);
  }

  return res.status(201).json({
    ok: true, referenceNo: row.reference_no, trackingPin: pin, emailStatus,
    notice: emailStatus === 'sent'
      ? 'Your report was saved and an email was sent to the configured municipal address. This is NOT an official complaint registration.'
      : 'Your report was saved but has NOT been emailed to the municipality. Please also use the official channel.',
  });
}
