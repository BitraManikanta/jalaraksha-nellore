alter table public.complaints add column if not exists ip_hash text;
create index if not exists complaints_ip_idx on public.complaints (ip_hash, created_at desc);
