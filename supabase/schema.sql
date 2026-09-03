-- ============================================================
-- BOIG · Supabase Schema (initial install)
-- Run in: Supabase Dashboard > SQL Editor > New query
-- Then run every file in supabase/migrations/ in order.
-- ============================================================

create table properties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  address text not null,
  type text default 'apartment',            -- apartment | house | commercial | other
  bedrooms int default 1,
  bathrooms int default 1,
  monthly_rent numeric(12,2) default 0,
  status text default 'available',          -- available | rented | maintenance
  notes text
);

create table tenants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  full_name text not null,
  email text,
  phone text,
  id_number text,
  notes text
);

create table contracts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  property_id uuid references properties(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  start_date date not null,
  end_date date,
  monthly_rent numeric(12,2) not null,
  deposit numeric(12,2) default 0,
  payment_day int default 5,
  status text default 'active'              -- active | ended
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  contract_id uuid references contracts(id) on delete cascade,
  due_date date not null,
  paid_date date,
  amount numeric(12,2) not null,
  status text default 'pending',            -- pending | paid
  method text,
  notes text
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  property_id uuid references properties(id) on delete cascade,
  category text not null,                   -- water | electricity | trash | wifi | hoa | other
  amount numeric(12,2) not null,
  expense_date date not null default current_date,
  notes text
);

create table maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  property_id uuid references properties(id) on delete cascade,
  category text not null default 'other',   -- ac | plumbing | electrical | paint | other
  description text not null,
  priority text default 'medium',           -- low | medium | high
  status text default 'open',               -- open | in_progress | resolved
  reported_date date default current_date,
  resolved_date date,
  cost numeric(12,2)
);

alter table properties enable row level security;
alter table tenants enable row level security;
alter table contracts enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
alter table maintenance_requests enable row level security;

do $$
declare t text;
begin
  foreach t in array array['properties','tenants','contracts','payments','expenses','maintenance_requests']
  loop
    execute format('create policy "auth full access" on %I for all to authenticated using (true) with check (true);', t);
    execute format('create policy "anon demo" on %I for all to anon using (true) with check (true);', t);
  end loop;
end $$;

-- IMPORTANT: the app ships with login. After creating your user
-- (Authentication > Users > Add user), run this block to remove anonymous access:
-- do $$ declare t text; begin
--   foreach t in array array['properties','tenants','contracts','payments','expenses','maintenance_requests']
--   loop execute format('drop policy "anon demo" on %I;', t); end loop;
-- end $$;
