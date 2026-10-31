-- JalaRaksha Nellore: core schema. Run in Supabase > SQL Editor.
create extension if not exists pgcrypto;

create type complaint_status as enum ('received','under_review','forwarded','resolved','closed');
create type email_state as enum ('not_configured','pending','sent','failed');
create sequence if not exists complaint_seq start 1000;

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  reference_no text unique not null
    default ('JR-' || to_char(now(),'YYYY') || '-' || lpad(nextval('complaint_seq')::text,6,'0')),
  pin_hash text not null,
  category text not null check (category in
    ('sewage','solid_waste','plastics','industrial','agricultural','oil_chemical','other')),
  description text not null check (char_length(description) between 20 and 2000),
  observed_on date not null check (observed_on <= current_date),
  locality text not null check (char_length(locality) between 2 and 120),
  landmark text check (char_length(landmark) <= 160),
  reporter_name text check (char_length(reporter_name) <= 80),
  reporter_contact text check (char_length(reporter_contact) <= 120),
  consent_given boolean not null check (consent_given),
  photo_path text,
  status complaint_status not null default 'received',
  email_status email_state not null default 'not_configured',
  emailed_at timestamptz,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index complaints_created_idx on public.complaints (created_at desc);
create index complaints_status_idx on public.complaints (status);
create index complaints_category_idx on public.complaints (category);

create table public.complaint_events (
  id bigint generated always as identity primary key,
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  note text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  email text not null check (char_length(email) <= 160),
  message text not null check (char_length(message) between 10 and 2000),
  created_at timestamptz not null default now()
);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger complaints_touch before update on public.complaints
  for each row execute function public.touch_updated_at();

-- RLS ON everywhere. The public (anon) role gets NO policies = no access.
alter table public.complaints enable row level security;
alter table public.complaint_events enable row level security;
alter table public.contact_messages enable row level security;
alter table public.admin_users enable row level security;
revoke all on public.complaints, public.complaint_events,
  public.contact_messages, public.admin_users from anon;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.admin_users where user_id = auth.uid()) $$;

create policy admin_read_complaints on public.complaints
  for select to authenticated using (public.is_admin());
create policy admin_update_complaints on public.complaints
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_events on public.complaint_events
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_read_messages on public.contact_messages
  for select to authenticated using (public.is_admin());
create policy admin_self_check on public.admin_users
  for select to authenticated using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('complaint-photos','complaint-photos', false, 3145728,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
