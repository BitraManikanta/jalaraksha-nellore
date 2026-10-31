export default function Logo({ size = 40 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="JalaRaksha logo">
    <defs><linearGradient id="jrg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7fe3ee" /><stop offset="1" stopColor="#0b5f8a" /></linearGradient></defs>
    <path d="M24 3C24 3 8 21 8 31a16 16 0 0 0 32 0C40 21 24 3 24 3z" fill="url(#jrg)" stroke="#fff" strokeWidth="1.5" />
    <path d="M13 32q5-5 11 0t11 0" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M18 24l4 4 8-8" stroke="#bff5c8" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
