-- ============================================================
-- BOIG · Migration 001 · Per-property accounts
-- Run in: Supabase Dashboard > SQL Editor > New query
-- Safe to run more than once.
-- ============================================================

-- Columns added after the first release (appliance inventory, lease details)
alter table properties add column if not exists appliances text;
alter table contracts  add column if not exists payment_method text default 'zelle';
alter table contracts  add column if not exists payable_to text;
alter table contracts  add column if not exists signed boolean default false;
alter table contracts  add column if not exists signed_date date;

-- Dashboard reminder tracker
create table if not exists reminder_checks (
  id uuid primary key default gen_random_uuid(),
  checked_at date not null default current_date
);

-- Utility / service accounts held per property (FPL, water, HOA, WiFi…).
-- The individual bills stay in `expenses`; this table is the standing account.
create table if not exists property_services (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  property_id uuid references properties(id) on delete cascade,
  category text not null default 'other',    -- water | electricity | trash | wifi | hoa | other
  provider text,
  account_number text,
  billing_day int,
  monthly_estimate numeric(12,2),
  paid_by text default 'owner',              -- owner | tenant
  status text default 'active',              -- active | cancelled
  notes text
);

create index if not exists property_services_property_idx on property_services(property_id);
create index if not exists expenses_property_idx on expenses(property_id);
create index if not exists maintenance_property_idx on maintenance_requests(property_id);
create index if not exists contracts_property_idx on contracts(property_id);
create index if not exists payments_contract_idx on payments(contract_id);

alter table reminder_checks enable row level security;
alter table property_services enable row level security;

do $$
declare t text;
begin
  foreach t in array array['reminder_checks','property_services']
  loop
    execute format('drop policy if exists "auth full access" on %I;', t);
    execute format('create policy "auth full access" on %I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;
