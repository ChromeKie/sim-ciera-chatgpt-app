-- Durable single-user ledger for Sim-Ciera.
-- Apply this once to the selected Supabase project.

create table if not exists public.sim_ciera_state (
  id uuid primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.sim_ciera_state is
  'Private state documents for hosted Sim-Ciera MCP installations.';

alter table public.sim_ciera_state enable row level security;

revoke all on table public.sim_ciera_state from public, anon, authenticated;
grant select, insert, update on table public.sim_ciera_state to anon;

drop policy if exists "sim_ciera_read_own_store" on public.sim_ciera_state;
create policy "sim_ciera_read_own_store"
on public.sim_ciera_state
for select
to anon
using (
  id::text = (select (
    coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb
    ->> 'x-sim-ciera-store-id'
  )
  )
);

drop policy if exists "sim_ciera_insert_own_store" on public.sim_ciera_state;
create policy "sim_ciera_insert_own_store"
on public.sim_ciera_state
for insert
to anon
with check (
  id::text = (select (
    coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb
    ->> 'x-sim-ciera-store-id'
  )
  )
);

drop policy if exists "sim_ciera_update_own_store" on public.sim_ciera_state;
create policy "sim_ciera_update_own_store"
on public.sim_ciera_state
for update
to anon
using (
  id::text = (select (
    coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb
    ->> 'x-sim-ciera-store-id'
  )
  )
)
with check (
  id::text = (select (
    coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb
    ->> 'x-sim-ciera-store-id'
  )
  )
);
