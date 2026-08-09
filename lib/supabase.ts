import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const money = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(Number(n));

export const fmtDate = (d: string | null | undefined) =>
  d
    ? new Date(d + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "—";

export const EXPENSE_CATEGORIES = ["water", "electricity", "trash", "wifi", "hoa", "other"] as const;
export const MAINTENANCE_CATEGORIES = ["ac", "plumbing", "electrical", "paint", "other"] as const;
