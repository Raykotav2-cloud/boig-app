rm -rf app/reports
mkdir -p app/reports
cat > app/reports/page.tsx << 'ENDOFFILE'
"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase, money, fmtDate } from "@/lib/supabase";

type Range = { label: string; start: string; end: string };

function monthOptions(): Range[] {
  const out: Range[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.toISOString().slice(0, 10);
    const endD = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const end = endD.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    out.push({ label, start, end });
  }
  return out;
}

function yearOptions(): Range[] {
  const out: Range[] = [];
  const now = new Date();
  for (let i = 0; i < 5; i++) {
    const y = now.getFullYear() - i;
    out.push({ label: `${y}`, start: `${y}-01-01`, end: `${y}-12-31` });
  }
  return out;
}

export default function Reports() {
  const months = useMemo(monthOptions, []);
  const years = useMemo(yearOptions, []);
  const [mode, setMode] = useState<"month" | "year" | "all">("month");
  const [rangeIdx, setRangeIdx] = useState(0);
  const [properties, setProperties] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [maint, setMaint] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, pay, exp, m] = await Promise.all([
        supabase.from("properties").select("id,name"),
        supabase.from("payments").select("amount,paid_date,status,contract_id,contracts(property_id)"),
        supabase.from("expenses").select("amount,expense_date,property_id,category"),
        supabase.from("maintenance_requests").select("cost,resolved_date,property_id,status"),
      ]);
      setProperties(p.data ?? []);
      setPayments(pay.data ?? []);
      setExpenses(exp.data ?? []);
      setMaint(m.data ?? []);
      setLoading(false);
    })();
  }, []);

  const range: Range | null =
    mode === "month" ? months[rangeIdx] : mode === "year" ? years[rangeIdx] : null;

  const inRange = (d: string | null) => {
    if (!d) return false;
    if (!range) return true;
    return d >= range.start && d <= range.end;
  };

  const rows = properties.map((prop) => {
    const income = payments
      .filter((p) => p.status === "paid" && p.contracts?.property_id === prop.id && inRange(p.paid_date))
      .reduce((s, p) => s + Number(p.amount), 0);
    const expTotal = expenses
      .filter((e) => e.property_id === prop.id && inRange(e.expense_date))
      .reduce((s, e) => s + Number(e.amount), 0);
    const maintTotal = maint
      .filter((m) => m.property_id === prop.id && m.status === "resolved" && inRange(m.resolved_date))
      .reduce((s, m) => s + Number(m.cost ?? 0), 0);
    const expenses_total = expTotal + maintTotal;
    return { property: prop.name, income, expenses: expenses_total, net: income - expenses_total };
  });

  const totals = rows.reduce(
    (acc, r) => ({ income: acc.income + r.income, expenses: acc.expenses + r.expenses, net: acc.net + r.net }),
    { income: 0, expenses: 0, net: 0 }
  );

  const byCategory = ["water", "electricity", "trash", "wifi", "hoa", "other"].map((cat) => ({
    cat,
    total: expenses.filter((e) => e.category === cat && inRange(e.expense_date)).reduce((s, e) => s + Number(e.amount), 0),
  })).filter((x) => x.total > 0);

  const exportCsv = () => {
    const periodLabel = range ? range.label : "All time";
    const lines = [
      `BOIG Financial Report - ${periodLabel}`,
      "",
      "Property,Income,Expenses,Net",
      ...rows.map((r) => `${r.property},${r.income.toFixed(2)},${r.expenses.toFixed(2)},${r.net.toFixed(2)}`),
      "",
      `Total,${totals.income.toFixed(2)},${totals.expenses.toFixed(2)},${totals.net.toFixed(2)}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BOIG-report-${periodLabel.replace(/\s/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-ink/50">Income vs. expenses by property</p>
        </div>
        <button className="btn" onClick={exportCsv}>Export CSV</button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {(["month", "year", "all"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setRangeIdx(0); }}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize ${mode === m ? "bg-blue text-white font-semibold" : "border border-white/15 text-ink/60"}`}>
              {m === "all" ? "All time" : m}
            </button>
          ))}
        </div>
        {mode !== "all" && (
          <select className="input w-auto" value={rangeIdx} onChange={(e) => setRangeIdx(Number(e.target.value))}>
            {(mode === "month" ? months : years).map((r, i) => (
              <option key={r.label} value={i}>{r.label}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <p className="text-ink/50">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4">
              <p className="text-xs uppercase tracking-wide text-gold/70">Income</p>
              <p className="text-xl font-bold mt-1 text-sage">{money(totals.income)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs uppercase tracking-wide text-gold/70">Expenses</p>
              <p className="text-xl font-bold mt-1 text-danger">{money(totals.expenses)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs uppercase tracking-wide text-gold/70">Net</p>
              <p className={`text-xl font-bold mt-1 ${totals.net >= 0 ? "text-sage" : "text-danger"}`}>{money(totals.net)}</p>
            </div>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead><tr><th className="th">Property</th><th className="th">Income</th><th className="th">Expenses</th><th className="th">Net</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.property}>
                    <td className="td font-semibold">{r.property}</td>
                    <td className="td text-sage">{money(r.income)}</td>
                    <td className="td text-danger">{money(r.expenses)}</td>
                    <td className={`td font-semibold ${r.net >= 0 ? "text-sage" : "text-danger"}`}>{money(r.net)}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td className="td text-ink/50" colSpan={4}>No properties yet.</td></tr>}
              </tbody>
            </table>
          </div>

          {byCategory.length > 0 && (
            <div className="card p-4">
              <h2 className="font-bold mb-3">Expenses by category</h2>
              <div className="flex flex-wrap gap-2">
                {byCategory.map((x) => (
                  <span key={x.cat} className="badge bg-white/10 px-3 py-1.5 text-sm capitalize">
                    {x.cat}: <b>{money(x.total)}</b>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
ENDOFFILE
ls -la app/reports/