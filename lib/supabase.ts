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

export const EXPENSE_LABELS: Record<string, string> = {
  water: "Water", electricity: "Electricity", trash: "Trash", wifi: "WiFi", hoa: "HOA", other: "Other",
};
export const MAINTENANCE_LABELS: Record<string, string> = {
  ac: "A/C", plumbing: "Plumbing", electrical: "Electrical", paint: "Paint", other: "Other",
};
export const PAYMENT_METHODS = ["zelle", "cash", "transfer", "check", "card", "other"] as const;
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  zelle: "Zelle", cash: "Cash", transfer: "Transfer", check: "Check", card: "Card", other: "Other",
};

// Month key ("2026-03") -> short label ("Mar 2026")
export const monthLabel = (key: string) =>
  new Date(key + "-01T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });

// A Supabase error that means "this table hasn't been created yet"
export const isMissingTable = (error: any) =>
  !!error && (error.code === "42P01" || /does not exist|schema cache/i.test(error.message ?? ""));
