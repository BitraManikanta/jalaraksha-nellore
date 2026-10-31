import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { CATEGORIES } from './validation';

const PDF = '/report/JalaRaksha-Nellore-CSP-Report-MD-Almas-Afeefa.pdf';
const LABEL: Record<string, string> = { sewage: 'Sewage / drain overflow', solid_waste: 'Solid waste dumping', plastics: 'Plastics',
  industrial: 'Industrial discharge', agricultural: 'Agricultural runoff', oil_chemical: 'Oil / chemicals', other: 'Other' };
const STATUSES = ['received', 'under_review', 'forwarded', 'resolved', 'closed'];

function Page({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => { document.title = `${title} | JalaRaksha Nellore`; }, [title]);
  return <main><h1>{title}</h1>{children}</main>;
}
async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Something went wrong. Please try again.');
  return j;
}

function Home() {
  return <Page title="JalaRaksha Nellore">
    <p>Learn about water pollution, report problems in Nellore, and find official complaint channels.</p>
    <p><Link className="btn" to="/report">Report a problem</Link> <Link className="btn alt" to="/learn">Learn more</Link></p>
    <div className="grid">{[['Sewage', 'Untreated wastewater spreads germs and removes oxygen from water.'], ['Plastics & solid waste', 'Litter blocks drains and harms animals.'],
      ['Chemicals & oil', 'Detergents, oils and pesticides can poison water life.'], ['Runoff', 'Rain washes fertiliser and soil into ponds and canals.']]
      .map(([t, d]) => <div className="card" key={t}><h3>{t}</h3><p>{d}</p></div>)}</div>
    <h2>How it works</h2><ol><li>Report what you saw.</li><li>Save your reference number and PIN.</li><li>Track the status. Also use the official channel.</li></ol>
    <p className="warn">JalaRaksha is an independent student project. It is not run by or affiliated with Nellore Municipal Corporation.</p>
  </Page>;
}
function Learn() {
  const rows = [['Physical', 'Plastic, debris, soil', 'Cloudy water, blocked flow'], ['Biological', 'Sewage, animal waste', 'Disease-causing germs'],
    ['Chemical', 'Detergents, oils, pesticides', 'Toxic to people and aquatic life'], ['Nutrient', 'Fertiliser, food waste', 'Algae, low oxygen'], ['Groundwater', 'Leaking septic tanks, chemicals', 'Hard to detect or remove']];
  return <Page title="Understanding water pollution">
    <p>Appearance alone cannot show whether water is safe. Only authorised laboratory testing can confirm that.</p>
    <div className="tw"><table><thead><tr><th>Type</th><th>Sources</th><th>Concern</th></tr></thead><tbody>{rows.map(r => <tr key={r[0]}>{r.map(c => <td key={c}>{c}</td>)}</tr>)}</tbody></table></div>
    <h2>Effects</h2><p>Illness, harm to fish and plants, bad smells, blocked drains, flooding and higher treatment costs.</p>
    <h2>Prevention and control</h2><p>Segregate waste, never dump into drains or ponds, maintain septic tanks and drains, use fertilisers carefully, and report problems early.</p>
  </Page>;
}
function Awareness() {
  return <Page title="Community awareness"><div className="grid">{[['Waste segregation', 'Keep wet, dry and hazardous waste separate.'],
    ['No dumping', 'Never throw waste, oil or paint into drains, ponds or canals.'], ['Save water', 'Fix leaks, turn off taps, reuse water safely.'],
    ['Rainwater harvesting', 'Collect roof rainwater; treat it before drinking.'], ['Detergents', 'Use small amounts; avoid washing at the water edge.'],
    ['Cleanups', 'Wear gloves, avoid entering polluted water, hand waste to the municipal service.']]
    .map(([t, d]) => <div className="card" key={t}><h3>{t}</h3><p>{d}</p></div>)}</div></Page>;
}
function Report() {
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [res, setRes] = useState<any>(null);
  const [photo, setPhoto] = useState<string>('');
  const today = new Date().toISOString().slice(0, 10);
  function pick(f?: File) {
    setPhoto(''); setErr('');
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 2 * 1024 * 1024) { setErr('Photo must be JPG, PNG or WebP, up to 2 MB.'); return; }
    const r = new FileReader(); r.onload = () => setPhoto(String(r.result)); r.readAsDataURL(f);
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr('');
    const f = new FormData(e.currentTarget); const g = (k: string) => String(f.get(k) ?? '');
    try {
      setRes(await post('/api/complaints', { category: g('category'), description: g('description'), observedOn: g('observedOn'), locality: g('locality'),
        landmark: g('landmark') || undefined, reporterName: g('reporterName') || undefined, reporterContact: g('reporterContact') || undefined,
        consent: f.get('consent') === 'on', photo: photo || undefined, website: g('website') }));
    } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }
  if (res) return <Page title="Report received"><div className="ok"><p>Reference number: <b>{res.referenceNo}</b></p><p>Tracking PIN: <b>{res.trackingPin}</b></p>
    <p><b>Write both down now. The PIN is shown only once.</b></p><p>{res.notice}</p></div></Page>;
  return <Page title="Report a water pollution problem"><form onSubmit={submit}>
    <label htmlFor="category">Category *</label><select id="category" name="category" required>{CATEGORIES.map(c => <option key={c} value={c}>{LABEL[c]}</option>)}</select>
    <label htmlFor="description">What did you see? (20 to 2000 characters) *</label><textarea id="description" name="description" rows={5} minLength={20} maxLength={2000} required />
    <label htmlFor="observedOn">Date observed *</label><input id="observedOn" name="observedOn" type="date" max={today} defaultValue={today} required />
    <label htmlFor="locality">Locality *</label><input id="locality" name="locality" minLength={2} maxLength={120} required />
    <label htmlFor="landmark">Landmark (optional)</label><input id="landmark" name="landmark" maxLength={160} />
    <label htmlFor="reporterName">Your name (optional)</label><input id="reporterName" name="reporterName" maxLength={80} />
    <label htmlFor="reporterContact">Email or phone (optional)</label><input id="reporterContact" name="reporterContact" maxLength={120} />
    <label htmlFor="photo">Photo (optional, JPG/PNG/WebP, max 2 MB)</label><input id="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => pick(e.target.files?.[0])} />
    {photo && <img src={photo} alt="Preview of your photo" style={{ maxWidth: 220, marginTop: 8 }} />}
    <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
    <label><input type="checkbox" name="consent" required style={{ width: 'auto' }} /> I agree that this report and any details I entered may be stored and, if configured, emailed to a municipal address. *</label>
    {err && <p className="err" role="alert">{err}</p>}<p><button className="btn" disabled={busy}>{busy ? 'Saving...' : 'Submit report'}</button></p></form></Page>;
}
function Track() {
  const [d, setD] = useState<any>(null), [err, setErr] = useState('');
  async function go(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(''); setD(null); const f = new FormData(e.currentTarget);
    try { setD(await post('/api/track', { referenceNo: String(f.get('ref')).trim().toUpperCase(), pin: String(f.get('pin')).trim() })); } catch (x) { setErr((x as Error).message); }
  }
  return <Page title="Track a report"><form onSubmit={go}><label htmlFor="ref">Reference number (JR-2026-001000)</label><input id="ref" name="ref" required />
    <label htmlFor="pin">6-digit PIN</label><input id="pin" name="pin" inputMode="numeric" pattern="\d{6}" required /><p><button className="btn">Check status</button></p></form>
    {err && <p className="err" role="alert">{err}</p>}
    {d && <div className="card"><p>Status: <b>{LABEL[d.status] ?? d.status.replace('_', ' ')}</b></p><p>Category: {LABEL[d.category]} | Locality: {d.locality}</p>
      <p>Emailed by this site: {d.email_status === 'sent' ? 'Yes' : 'No'}</p><p className="warn">This is this website's own status, not live municipal tracking.</p></div>}</Page>;
}
const PHOTOS: [string, string][] = [['waterbody-bank-16oct', 'Waterbody and surrounding bank, Guruthota, 16 Oct 2026'], ['waste-at-water-edge-16oct', 'Mixed waste and packaging near the water edge, 16 Oct 2026'],
  ['waste-accumulation-golla-st', 'Waste accumulation close to the water edge, 16 Oct 2026'], ['waterbody-and-public-structure', 'Waterbody and a nearby public structure, 16 Oct 2026'],
  ['student-team-at-waterbody', 'Student team documenting the waterbody setting, 16 Oct 2026'], ['letter-handover-panchayat', 'Students presenting the project letter to the Panchayat Secretary, 16 Oct 2026'],
  ['group-community-visit', 'Group photograph during the community visit, 16 Oct 2026'], ['water-access-area-30oct', 'Water-access area (GPS tag: Dargamitta water tank), 30 Oct 2026']];
function Gallery() {
  return <Page title="Field photographs"><p>Photographs from the CSP field visits. They show visible conditions only and are not laboratory evidence.</p>
    <div className="grid">{PHOTOS.map(([f, c]) => <figure className="card" key={f}><a href={`/gallery/${f}.jpg`}><img loading="lazy" src={`/gallery/${f}-thumb.jpg`} alt={c} /></a><figcaption>{c}</figcaption></figure>)}</div></Page>;
}
function Csp() {
  return <Page title="CSP report"><p>Full report by MD. Almas Afeefa (24JNA30104).</p><p><a className="btn" href={PDF} target="_blank" rel="noopener">View PDF</a> <a className="btn alt" href={PDF} download>Download PDF</a></p></Page>;
}
function About() {
  return <Page title="About the project"><div className="card"><p><b>A Comprehensive Study of Water Pollution, Its Causes and Consequences, and Community-Based Strategies for Clean and Sustainable Water Resources</b></p>
    <p>Student: MD. Almas Afeefa (24JNA30104), AI &amp; DS (B), III B.Tech<br />Guide: Guru Prasad, CSE Department<br />College: Sree Venkateswara College of Engineering, North Rajupalem, Nellore<br />Period: 16 September to 30 October 2026</p></div>
    <h2>Method and limits</h2><p>Community visits, visual observation and photographs in Guruthota and nearby areas. No laboratory results are claimed.</p>
    <p className="warn">Independent student initiative. Not officially affiliated with Nellore Municipal Corporation.</p></Page>;
}
function Contact() {
  const [msg, setMsg] = useState(''), [err, setErr] = useState('');
  async function go(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(''); setMsg(''); const f = new FormData(e.currentTarget); const g = (k: string) => String(f.get(k) ?? '');
    try { await post('/api/contact', { name: g('name'), email: g('email'), message: g('message'), website: g('website') }); setMsg('Thank you. Your message was saved.'); e.currentTarget.reset(); } catch (x) { setErr((x as Error).message); }
  }
  return <Page title="Contact and directory"><h2>Official channels (please verify before relying on them)</h2>
    <div className="tw"><table><thead><tr><th>Office</th><th>Details</th><th>Source</th></tr></thead><tbody>
      <tr><td>Nellore Municipal Corporation, Dargamitta</td><td>Phone 0861-2316777</td><td>SPSR Nellore district website (spsnellore.ap.gov.in); confirm by phone</td></tr></tbody></table></div>
    <h2>Send feedback</h2><form onSubmit={go}><label htmlFor="name">Name</label><input id="name" name="name" required minLength={2} maxLength={80} />
      <label htmlFor="email">Email</label><input id="email" name="email" type="email" required /><label htmlFor="message">Message</label><textarea id="message" name="message" rows={4} required minLength={10} maxLength={2000} />
      <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />{err && <p className="err" role="alert">{err}</p>}{msg && <p className="ok">{msg}</p>}
      <p><button className="btn">Send</button></p></form></Page>;
}
function Privacy() {
  return <Page title="Privacy, terms and disclaimer"><p>We collect only what the form asks. Name and contact are optional. Reports are stored in a private database and are never shown publicly. Photos are stored privately.</p>
    <p>Reports are kept for the duration of the CSP evaluation. To correct or delete a report, use the Contact page with your reference number.</p>
    <p>If an email address is configured, your report text may be emailed to it. An email sent by this site is not an official complaint registration. Do not use this site for emergencies or drinking-water safety decisions.</p></Page>;
}
const sb = import.meta.env.VITE_SUPABASE_URL ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY) : null;
function Admin() {
  const [rows, setRows] = useState<any[] | null>(null), [err, setErr] = useState(''), [cat, setCat] = useState(''), [from, setFrom] = useState('');
  async function load() {
    const { data, error } = await sb!.from('complaints').select('*').order('created_at', { ascending: false });
    if (error) setErr('Not authorised or load failed.'); else setRows(data);
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const { error } = await sb!.auth.signInWithPassword({ email: String(f.get('email')), password: String(f.get('password')) });
    if (error) setErr('Sign-in failed.'); else { setErr(''); load(); }
  }
  async function setStatus(id: string, status: string) { await sb!.from('complaints').update({ status }).eq('id', id); load(); }
  function csv() {
    const esc = (v: unknown) => { const s = String(v ?? '').replace(/"/g, '""'); return `"${/^[=+\-@]/.test(s) ? "'" + s : s}"`; };
    const cols = ['reference_no', 'status', 'category', 'locality', 'landmark', 'observed_on', 'created_at', 'email_status', 'description'];
    const t = [cols.join(','), ...shown.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv' })); a.download = 'complaints.csv'; a.click();
  }
  const shown = (rows ?? []).filter(r => (!cat || r.category === cat) && (!from || r.observed_on >= from));
  if (!sb) return <Page title="Admin"><p className="err">Admin is not configured (missing Supabase settings).</p></Page>;
  if (!rows) return <Page title="Admin sign in"><form onSubmit={login}><label htmlFor="e">Email</label><input id="e" name="email" type="email" required /><label htmlFor="p">Password</label>
    <input id="p" name="password" type="password" required />{err && <p className="err">{err}</p>}<p><button className="btn">Sign in</button></p></form></Page>;
  return <Page title="Admin dashboard"><p><select value={cat} onChange={e => setCat(e.target.value)} aria-label="Category filter"><option value="">All categories</option>{CATEGORIES.map(c => <option key={c} value={c}>{LABEL[c]}</option>)}</select>
    <input type="date" value={from} onChange={e => setFrom(e.target.value)} aria-label="Observed from" /> <button className="btn" onClick={csv}>Export CSV</button></p>
    <div className="tw"><table><thead><tr><th>Ref</th><th>Category</th><th>Locality</th><th>Description</th><th>Email</th><th>Status</th></tr></thead><tbody>
      {shown.map(r => <tr key={r.id}><td>{r.reference_no}</td><td>{LABEL[r.category]}</td><td>{r.locality}</td><td>{r.description}</td><td>{r.email_status}</td>
        <td><select value={r.status} onChange={e => setStatus(r.id, e.target.value)} aria-label={`Status for ${r.reference_no}`}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table></div>
    {!shown.length && <p>No reports yet.</p>}</Page>;
}
export default function App() {
  const [open, setOpen] = useState(false);
  const links: [string, string][] = [['/', 'Home'], ['/learn', 'Learn'], ['/report', 'Report'], ['/track', 'Track'], ['/awareness', 'Awareness'], ['/gallery', 'Gallery'], ['/csp-report', 'CSP Report'], ['/about', 'About'], ['/contact', 'Contact']];
  return <><a href="#main" className="hp">Skip to content</a><header><div className="bar"><Link to="/" className="brand"><img src="/college-logo-1.png" alt="" width="36" height="36" />JalaRaksha Nellore</Link>
    <button className="btn menu" aria-expanded={open} onClick={() => setOpen(!open)}>Menu</button>
    <nav className={open ? 'open' : ''} onClick={() => setOpen(false)}>{links.map(([to, t]) => <NavLink key={to} to={to}>{t}</NavLink>)}</nav></div></header>
    <div id="main"><Routes><Route path="/" element={<Home />} /><Route path="/learn" element={<Learn />} /><Route path="/report" element={<Report />} /><Route path="/track" element={<Track />} />
      <Route path="/awareness" element={<Awareness />} /><Route path="/gallery" element={<Gallery />} /><Route path="/csp-report" element={<Csp />} /><Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} /><Route path="/privacy" element={<Privacy />} /><Route path="/admin" element={<Admin />} /><Route path="*" element={<Page title="Page not found"><Link to="/">Go home</Link></Page>} /></Routes></div>
    <footer>Designed and Developed by MD. Almas Afeefa | AI &amp; DS, III Year, Sree Venkateswara College of Engineering | JalaRaksha Nellore – Water Pollution CSP.<br />
      Independent student initiative, not affiliated with Nellore Municipal Corporation. <Link to="/privacy">Privacy &amp; terms</Link></footer></>;
}
