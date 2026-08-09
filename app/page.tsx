"use client";
import { useEffect, useState } from "react";
import { supabase, money, fmtDate } from "@/lib/supabase";
import Link from "next/link";

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const month = today.slice(0, 7);
      const [props, leases, payments, expenses, maint] = await Promise.all([
        supabase.from("properties").select("id,status"),
        supabase.from("contracts").select("id,status,monthly_rent").eq("status", "active"),
        supabase.from("payments").select("id,amount,status,due_date,paid_date"),
        supabase.from("expenses").select("amount,expense_date"),
        supabase.from("maintenance_requests").select("id,status,category,description,priority").neq("status", "resolved"),
      ]);
      const pays = payments.data ?? [];
      const overdue = pays.filter((p) => p.status !== "paid" && p.due_date < today);
      const collected = pays
        .filter((p) => p.status === "paid" && p.paid_date?.startsWith(month))
        .reduce((s, p) => s + Number(p.amount), 0);
      const monthExpenses = (expenses.data ?? [])
        .filter((g) => g.expense_date?.startsWith(month))
        .reduce((s, g) => s + Number(g.amount), 0);
      setStats({
        total: props.data?.length ?? 0,
        rented: props.data?.filter((p) => p.status === "rented").length ?? 0,
        expectedRent: (leases.data ?? []).reduce((s, c) => s + Number(c.monthly_rent), 0),
        collected,
        monthExpenses,
        overdue,
        openMaint: maint.data ?? [],
      });
    })();
  }, []);

  if (!stats) return <p className="text-ink/50">Loading dashboard…</p>;

  const kpis = [
    { label: "Properties", value: `${stats.rented}/${stats.total}`, sub: "rented" },
    { label: "Expected monthly rent", value: money(stats.expectedRent), sub: "active leases" },
    { label: "Collected this month", value: money(stats.collected), sub: "recorded payments" },
    { label: "Expenses this month", value: money(stats.monthExpenses), sub: "water, power, HOA…" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-ink/50">Your rental portfolio at a glance</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="card p-4">
            <p className="text-xs uppercase tracking-wide text-gold/70">{k.label}</p>
            <p className="text-xl font-bold mt-1">{k.value}</p>
            <p className="text-xs text-ink/40">{k.sub}</p>
          </div>
        ))}
      </div>

      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Overdue payments</h2>
          <Link href="/payments" className="btn-ghost">View payments</Link>
        </div>
        {stats.overdue.length === 0 ? (
          <p className="text-sm text-sage font-semibold">No overdue payments. All caught up ✓</p>
        ) : (
          <ul className="space-y-2">
            {stats.overdue.map((p: any) => (
              <li key={p.id} className="flex justify-between text-sm border-t border-white/5 pt-2 first:border-0 first:pt-0">
                <span className="text-danger font-semibold">Due {fmtDate(p.due_date)}</span>
                <span className="font-semibold">{money(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Open maintenance</h2>
          <Link href="/maintenance" className="btn-ghost">View all</Link>
        </div>
        {stats.openMaint.length === 0 ? (
          <p className="text-sm text-ink/50">No open requests.</p>
        ) : (
          <ul className="space-y-2">
            {stats.openMaint.map((m: any) => (
              <li key={m.id} className="flex justify-between gap-3 text-sm border-t border-white/5 pt-2 first:border-0 first:pt-0">
                <span className="truncate">
                  <span className="badge bg-white/10 mr-2 uppercase">{m.category}</span>
                  {m.description}
                </span>
                <span className={`badge ${m.priority === "high" ? "bg-danger/15 text-danger" : "bg-white/10 text-ink/70"}`}>
                  {m.priority}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
