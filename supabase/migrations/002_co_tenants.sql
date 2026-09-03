-- ============================================================
-- BOIG · Migration 002 · Additional tenants on a lease
-- Run in: Supabase Dashboard > SQL Editor > New query
-- Safe to run more than once.
-- ============================================================

-- Leases are signed by one primary tenant plus, sometimes, a spouse or
-- co-signer. Their names print in Section 1 of the generated lease.
alter table contracts add column if not exists co_tenants text;
