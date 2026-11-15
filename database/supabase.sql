-- Run once in your Supabase project's SQL Editor. Contains schema only, no guest data.
begin;

create table if not exists public.guest_responses (
  id uuid primary key,
  session_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  language text not null check (language in ('vi', 'en', 'zh-TW')),
  guest_group text not null check (guest_group in ('groom', 'bride')),
  transport text not null check (transport in ('self', 'shuttle')),
  pickup_point smallint,
  event_date date not null,
  created_at timestamptz not null default now(),
  constraint pickup_matches_group check (
    (transport = 'self' and pickup_point is null) or
    (transport = 'shuttle' and pickup_point is not null and
      ((guest_group = 'groom' and pickup_point = 1) or (guest_group = 'bride' and pickup_point = 2)))
  )
);
create index if not exists guest_responses_created_at on public.guest_responses(created_at desc);
create index if not exists guest_responses_session on public.guest_responses(session_id, created_at desc);
alter table public.guest_responses enable row level security;
revoke all on public.guest_responses from public, anon, authenticated;
-- An insert-only RPC handles retry deduplication without granting visitors
-- SELECT on the primary key (required by a direct ON CONFLICT request).
create or replace function public.submit_guest_response(p_input jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.guest_responses
    (id, session_id, name, language, guest_group, transport, pickup_point, event_date)
  values (
    (p_input->>'id')::uuid, (p_input->>'session_id')::uuid,
    p_input->>'name', p_input->>'language', p_input->>'guest_group',
    p_input->>'transport', (p_input->>'pickup_point')::smallint,
    (p_input->>'event_date')::date
  )
  on conflict (id) do nothing;
$$;
revoke all on function public.submit_guest_response(jsonb) from public;
grant execute on function public.submit_guest_response(jsonb) to anon, authenticated;
-- No direct table access for visitors. Only the project owner can read replies.

create table if not exists public.wedding_wishes (
  id uuid primary key,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  message text not null check (char_length(btrim(message)) between 1 and 1000),
  language text not null check (language in ('vi', 'en', 'zh-TW')),
  created_at timestamptz not null default now()
);
create index if not exists wedding_wishes_created_at on public.wedding_wishes(created_at desc);
alter table public.wedding_wishes enable row level security;
revoke all on public.wedding_wishes from public, anon, authenticated;
grant select (id, name, message, created_at) on public.wedding_wishes to anon, authenticated;
grant insert (id, name, message, language) on public.wedding_wishes to anon, authenticated;
drop policy if exists "Visitors may read public wishes" on public.wedding_wishes;
create policy "Visitors may read public wishes" on public.wedding_wishes
  for select to anon, authenticated using (true);
drop policy if exists "Visitors may leave a wish" on public.wedding_wishes;
create policy "Visitors may leave a wish" on public.wedding_wishes
  for insert to anon, authenticated with check (true);

notify pgrst, 'reload schema';
commit;