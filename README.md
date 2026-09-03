# BOIG · Berthet-Ortega Investment Group

Rental property management app: tenants, leases, payments and delinquency tracking, expenses (water, electricity, trash, WiFi, HOA) and maintenance (A/C, plumbing, etc.), with a summary dashboard and a full **account per property**. Includes login.

**Stack:** Next.js 14 · Supabase · Tailwind · Vercel

## Setup (15 minutes)

### 1 · Supabase
1. Create a project at https://supabase.com
2. Go to **SQL Editor → New query**, paste the contents of `supabase/schema.sql` and click **Run**.
   Then run each file in `supabase/migrations/` the same way (they are safe to re-run).
3. In **Project Settings → API**, copy the **Project URL** and the **anon public key**.
4. Create your login user: **Authentication → Users → Add user** (check *Auto Confirm*).

### 2 · GitHub
1. Create a new **private** repository (e.g. `boig-app`).
2. Push this code:
   ```bash
   git init
   git add .
   git commit -m "BOIG initial"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/boig-app.git
   git push -u origin main
   ```

### 3 · Vercel
1. Go to https://vercel.com → **Add New → Project** → import the GitHub repo.
2. Under **Environment Variables** add:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your anon key
3. **Deploy**. Every push to `main` deploys automatically.

### Local development (optional)
```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev                  # http://localhost:3000
```

## How to use
1. **Properties** → add your units. Click a property (or **Account**) to open its own account page.
2. **Tenants** → add people.
3. **Leases** → link property + tenant, set rent and payment day. Use **"Generate payments"** to create the monthly installments.
4. **Payments** → mark as paid when rent comes in; anything past due shows as *overdue* automatically.
5. **Expenses** → log water, electricity, trash, WiFi and HOA per property.
6. **Maintenance** → create requests (e.g. A/C), set priority, resolve with cost.
7. **Dashboard** → expected vs collected rent, monthly expenses, overdue payments and open maintenance.
8. **Reports** → income vs. expenses by property, exportable to CSV.

### Account per property
`Properties → Account` opens everything tied to a single unit, with five KPIs on top
(monthly rent, collected, outstanding, expenses and net) and six tabs:

- **Ledger** — month-by-month statement for the selected year: rent charged, rent collected,
  service bills, maintenance and net, plus a year total.
- **Rent payments** — that unit's monthly installments. *Mark paid* records the date, method
  (Zelle, cash, transfer, check, card) and a note; *Record charge* adds a one-off like a late fee.
- **Services & bills** — the standing utility accounts (provider, account number, billing day,
  monthly estimate, paid by owner or tenant) and every bill logged against them.
- **Maintenance** — requests for that unit, resolved with their final cost.
- **Contracts** — leases on that unit: generate the Word contract, generate monthly payments,
  copy the tenant portal link.
- **Documents** — files in the `documents` storage bucket for that unit.

## Security
After creating your user, run the commented block at the end of `schema.sql` to remove anonymous data access, so only logged-in users can read or write.
