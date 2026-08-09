# BOIG · Berthet-Ortega Investment Group

Rental property management app: tenants, leases, payments and delinquency tracking, expenses (water, electricity, trash, WiFi, HOA) and maintenance (A/C, plumbing, etc.), with a summary dashboard. Includes login.

**Stack:** Next.js 14 · Supabase · Tailwind · Vercel

## Setup (15 minutes)

### 1 · Supabase
1. Create a project at https://supabase.com
2. Go to **SQL Editor → New query**, paste the contents of `supabase/schema.sql` and click **Run**.
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
1. **Properties** → add your units.
2. **Tenants** → add people.
3. **Leases** → link property + tenant, set rent and payment day. Use **"Generate payments"** to create the monthly installments.
4. **Payments** → mark as paid when rent comes in; anything past due shows as *overdue* automatically.
5. **Expenses** → log water, electricity, trash, WiFi and HOA per property.
6. **Maintenance** → create requests (e.g. A/C), set priority, resolve with cost.
7. **Dashboard** → expected vs collected rent, monthly expenses, overdue payments and open maintenance.

## Security
After creating your user, run the commented block at the end of `schema.sql` to remove anonymous data access, so only logged-in users can read or write.
