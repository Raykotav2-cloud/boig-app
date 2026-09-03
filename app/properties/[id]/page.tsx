"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  supabase, money, fmtDate, monthLabel, isMissingTable,
  EXPENSE_CATEGORIES, EXPENSE_LABELS, MAINTENANCE_CATEGORIES, MAINTENANCE_LABELS,
  PAYMENT_METHODS, PAYMENT_METHOD_LABELS,
} from "@/lib/supabase";
import { generatePaymentsForContract } from "@/lib/payments";
import PropertyDocuments from "@/components/PropertyDocuments";
import { generateLeaseDocx } from "@/lib/generateLeaseDoc";

const TABS = ["ledger", "payments", "services", "maintenance", "contracts", "documents"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  ledger: "Ledger",
  payments: "Rent payments",
  services: "Services & bills",
  maintenance: "Maintenance",
  contracts: "Contracts",
  documents: "Documents",
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyBill = (category = "water") => ({ category, amount: "", expense_date: todayStr(), notes: "" });
const emptyService = () => ({ category: "water", provider: "", account_number: "", billing_day: "", monthly_estimate: "", paid_by: "owner", status: "active", notes: "" });
const emptyRequest = () => ({ category: "ac", description: "", priority: "medium", status: "open", reported_date: todayStr(), cost: "" });

export default function PropertyAccount({ params }: { params: { id: string } }) {
  const id = params.id;
  const today = todayStr();

  const [prop, setProp] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [servicesMissing, setServicesMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const [tab, setTab] = useState<Tab>("ledger");
  const [year, setYear] = useState(new Date().getFullYear());
  const [payFilter, setPayFilter] = useState("all");

  // null = form closed. Any other value = the record being created/edited.
  const [billForm, setBillForm] = useState<any>(null);
  const [serviceForm, setServiceForm] = useState<any>(null);
  const [requestForm, setRequestForm] = useState<any>(null);
  const [chargeForm, setChargeForm] = useState<any>(null);
  const [settleForm, setSettleForm] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, c, e, m] = await Promise.all([
      supabase.from("properties").select("*").eq("id", id).single(),
      supabase.from("contracts").select("*, tenants(id,full_name,email,phone)").eq("property_id", id).order("start_date", { ascending: false }),
      supabase.from("expenses").select("*").eq("property_id", id).order("expense_date", { ascending: false }),
      supabase.from("maintenance_requests").select("*").eq("property_id", id).order("reported_date", { ascending: false }),
    ]);
    if (p.error || !p.data) { setMissing(true); setLoading(false); return; }
    setProp(p.data);
    const cs = c.data ?? [];
    setContracts(cs);
    setBills(e.data ?? []);
    setRequests(m.data ?? []);

    const ids = cs.map((x: any) => x.id);
    if (ids.length) {
      const pay = await supabase.from("payments").select("*").in("contract_id", ids).order("due_date", { ascending: false });
      setPayments(pay.data ?? []);
    } else {
      setPayments([]);
    }

    const sv = await supabase.from("property_services").select("*").eq("property_id", id).order("category");
    if (sv.error) { setServicesMissing(isMissingTable(sv.error)); setServices([]); }
    else { setServicesMissing(false); setServices(sv.data ?? []); }

    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const tenantOf = (contractId: string) =>
    contracts.find((c) => c.id === contractId)?.tenants?.full_name ?? "—";

  const payState = (p: any) => (p.status === "paid" ? "paid" : p.due_date < today ? "overdue" : "pending");
  const payBadge = (s: string) =>
    s === "paid" ? "bg-sage/15 text-sage" : s === "overdue" ? "bg-danger/15 text-danger" : "bg-gold/15 text-gold";

  const activeContract = contracts.find((c) => c.status === "active");

  const outstanding = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + Number(p.amount), 0);
  const overdueTotal = payments.filter((p) => payState(p) === "overdue").reduce((s, p) => s + Number(p.amount), 0);
  const openRequests = requests.filter((r) => r.status !== "resolved");

  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    payments.forEach((p) => { if (p.due_date) set.add(Number(p.due_date.slice(0, 4))); });
    bills.forEach((b) => { if (b.expense_date) set.add(Number(b.expense_date.slice(0, 4))); });
    requests.forEach((r) => { if (r.resolved_date) set.add(Number(r.resolved_date.slice(0, 4))); });
    return Array.from(set).sort((a, b) => b - a);
  }, [payments, bills, requests]);

  // One row per month: rent charged, rent collected, service bills, maintenance, net.
  const ledger = useMemo(() => {
    const sum = (arr: any[], field: string) => arr.reduce((s, x) => s + Number(x[field] ?? 0), 0);
    return Array.from({ length: 12 }, (_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, "0")}`;
      const charged = sum(payments.filter((p) => p.due_date?.startsWith(key)), "amount");
      const collected = sum(payments.filter((p) => p.status === "paid" && p.paid_date?.startsWith(key)), "amount");
      const svc = sum(bills.filter((b) => b.expense_date?.startsWith(key)), "amount");
      const mnt = sum(requests.filter((r) => r.status === "resolved" && r.resolved_date?.startsWith(key)), "cost");
      return { key, charged, collected, services: svc, maintenance: mnt, net: collected - svc - mnt };
    });
  }, [year, payments, bills, requests]);

  const totals = ledger.reduce(
    (a, r) => ({
      charged: a.charged + r.charged, collected: a.collected + r.collected,
      services: a.services + r.services, maintenance: a.maintenance + r.maintenance, net: a.net + r.net,
    }),
    { charged: 0, collected: 0, services: 0, maintenance: 0, net: 0 }
  );
  const activeMonths = ledger.filter((r) => r.charged || r.collected || r.services || r.maintenance);

  const yearBills = bills.filter((b) => b.expense_date?.startsWith(String(year)));

  // ---------- writes ----------
  const saveBill = async () => {
    if (!billForm.amount) return alert("Amount is required");
    const payload = {
      property_id: id, category: billForm.category, amount: Number(billForm.amount),
      expense_date: billForm.expense_date || today, notes: billForm.notes || null,
    };
    const { error } = billForm.id
      ? await supabase.from("expenses").update(payload).eq("id", billForm.id)
      : await supabase.from("expenses").insert(payload);
    if (error) return alert(error.message);
    setBillForm(null); load();
  };

  const saveService = async () => {
    const payload = {
      property_id: id, category: serviceForm.category,
      provider: serviceForm.provider || null, account_number: serviceForm.account_number || null,
      billing_day: serviceForm.billing_day === "" ? null : Number(serviceForm.billing_day),
      monthly_estimate: serviceForm.monthly_estimate === "" ? null : Number(serviceForm.monthly_estimate),
      paid_by: serviceForm.paid_by, status: serviceForm.status, notes: serviceForm.notes || null,
    };
    const { error } = serviceForm.id
      ? await supabase.from("property_services").update(payload).eq("id", serviceForm.id)
      : await supabase.from("property_services").insert(payload);
    if (error) return alert(error.message);
    setServiceForm(null); load();
  };

  const saveRequest = async () => {
    if (!requestForm.description) return alert("Description is required");
    const payload = {
      property_id: id, category: requestForm.category, description: requestForm.description,
      priority: requestForm.priority, status: requestForm.status,
      reported_date: requestForm.reported_date || today,
      cost: requestForm.cost === "" ? null : Number(requestForm.cost),
      resolved_date: requestForm.status === "resolved" ? (requestForm.resolved_date || today) : null,
    };
    const { error } = requestForm.id
      ? await supabase.from("maintenance_requests").update(payload).eq("id", requestForm.id)
      : await supabase.from("maintenance_requests").insert(payload);
    if (error) return alert(error.message);
    setRequestForm(null); load();
  };

  const resolveRequest = async (r: any) => {
    const cost = prompt("Final cost (leave empty if none):", r.cost ?? "");
    if (cost === null) return;
    const { error } = await supabase.from("maintenance_requests")
      .update({ status: "resolved", resolved_date: today, cost: cost === "" ? null : Number(cost) })
      .eq("id", r.id);
    if (error) return alert(error.message);
    load();
  };

  const saveCharge = async () => {
    if (!chargeForm.contract_id || !chargeForm.due_date || !chargeForm.amount)
      return alert("Lease, due date and amount are required");
    const { error } = await supabase.from("payments").insert({
      contract_id: chargeForm.contract_id, due_date: chargeForm.due_date,
      amount: Number(chargeForm.amount), status: "pending", notes: chargeForm.notes || null,
    });
    if (error) return alert(error.message);
    setChargeForm(null); load();
  };

  const settle = async () => {
    const { error } = await supabase.from("payments").update({
      status: "paid", paid_date: settleForm.paid_date || today,
      method: settleForm.method, notes: settleForm.notes || null,
    }).eq("id", settleForm.id);
    if (error) return alert(error.message);
    setSettleForm(null); load();
  };

  const unsettle = async (p: any) => {
    await supabase.from("payments").update({ status: "pending", paid_date: null }).eq("id", p.id);
    load();
  };

  const removeRow = async (table: string, rowId: string, label: string) => {
    if (!confirm(`Delete this ${label}?`)) return;
    const { error } = await supabase.from(table).delete().eq("id", rowId);
    if (error) return alert(error.message);
    load();
  };

  const runGeneratePayments = async (c: any) => {
    const msg = await generatePaymentsForContract(c);
    if (msg) { alert(msg); load(); }
  };

  const copyPortalLink = async (c: any) => {
    const url = `${window.location.origin}/portal/${c.id}`;
    try {
      await navigator.clipboard.writeText(url);
      alert(`Portal link copied!\n\n${url}\n\nSend this to ${c.tenants?.full_name ?? "the tenant"}.`);
    } catch {
      prompt("Copy this link:", url);
    }
  };

  const downloadContract = async (c: any) => {
    setBusy(c.id);
    try {
      const blob = await generateLeaseDocx({ ...c, properties: prop });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Lease-${(prop?.name ?? "property").replace(/\s+/g, "-")}-${(c.tenants?.full_name ?? "tenant").replace(/\s+/g, "-")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Could not generate the document: " + e.message);
    } finally {
      setBusy(null);
    }
  };

  // ---------- render ----------
  if (loading) return <p className="text-ink/50">Loading account…</p>;
  if (missing)
    return (
      <div className="space-y-3">
        <p className="text-ink/60">This property no longer exists.</p>
        <Link href="/properties" className="btn">Back to Properties</Link>
      </div>
    );

  const statusBadge = (s: string) =>
    s === "rented" ? "bg-sage/15 text-sage" : s === "maintenance" ? "bg-gold/15 text-gold" : "bg-white/10 text-ink/70";

  const kpis = [
    { label: "Monthly rent", value: money(activeContract?.monthly_rent ?? prop.monthly_rent), sub: activeContract ? `due day ${activeContract.payment_day}` : "no active lease" },
    { label: `Collected ${year}`, value: money(totals.collected), sub: `of ${money(totals.charged)} charged`, tone: "text-sage" },
    { label: "Outstanding", value: money(outstanding), sub: overdueTotal > 0 ? `${money(overdueTotal)} overdue` : "nothing overdue", tone: outstanding > 0 ? "text-danger" : "" },
    { label: `Expenses ${year}`, value: money(totals.services + totals.maintenance), sub: `${money(totals.services)} services · ${money(totals.maintenance)} repairs`, tone: "text-danger" },
    { label: `Net ${year}`, value: money(totals.net), sub: "collected − expenses", tone: totals.net >= 0 ? "text-sage" : "text-danger" },
  ];

  return (
    <div className="space-y-4">
      <Link href="/properties" className="text-sm text-ink/50 hover:text-ink">← Properties</Link>

      <header className="card p-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{prop.name}</h1>
            <span className={`badge ${statusBadge(prop.status)}`}>{prop.status}</span>
          </div>
          <p className="text-sm text-ink/50">{prop.address}</p>
          <p className="text-xs text-ink/40 mt-1 capitalize">
            {prop.type} · {prop.bedrooms}BD/{prop.bathrooms}BA
            {openRequests.length > 0 && <span className="text-gold"> · {openRequests.length} open request(s)</span>}
          </p>
          {prop.appliances && <p className="text-xs text-ink/40 mt-1">Includes: {prop.appliances}</p>}
        </div>
        {activeContract ? (
          <div className="text-sm text-right">
            <p className="label">Current tenant</p>
            <p className="font-semibold">{activeContract.tenants?.full_name}</p>
            <p className="text-xs text-ink/50">{activeContract.tenants?.phone || "—"} · {activeContract.tenants?.email || "—"}</p>
            <p className="text-xs text-ink/40">{fmtDate(activeContract.start_date)} → {fmtDate(activeContract.end_date)}</p>
          </div>
        ) : (
          <Link href="/leases" className="btn">+ New lease</Link>
        )}
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="card p-4">
            <p className="text-xs uppercase tracking-wide text-gold/70">{k.label}</p>
            <p className={`text-xl font-bold mt-1 ${k.tone ?? ""}`}>{k.value}</p>
            <p className="text-xs text-ink/40">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-sm ${tab === t ? "bg-blue text-white font-semibold" : "border border-white/15 text-ink/60"}`}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
        {tab !== "documents" && tab !== "contracts" && (
          <select className="input w-auto ml-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      {tab === "ledger" && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead><tr>
              <th className="th">Month</th><th className="th">Rent charged</th><th className="th">Collected</th>
              <th className="th">Services</th><th className="th">Maintenance</th><th className="th">Net</th>
            </tr></thead>
            <tbody>
              {activeMonths.map((r) => (
                <tr key={r.key}>
                  <td className="td font-semibold">{monthLabel(r.key)}</td>
                  <td className="td">{money(r.charged)}</td>
                  <td className="td text-sage">{money(r.collected)}</td>
                  <td className="td text-danger">{money(r.services)}</td>
                  <td className="td text-danger">{money(r.maintenance)}</td>
                  <td className={`td font-semibold ${r.net >= 0 ? "text-sage" : "text-danger"}`}>{money(r.net)}</td>
                </tr>
              ))}
              {activeMonths.length === 0 && (
                <tr><td className="td text-ink/50" colSpan={6}>Nothing recorded for {year} yet.</td></tr>
              )}
              {activeMonths.length > 0 && (
                <tr className="bg-white/5">
                  <td className="td font-bold">Total {year}</td>
                  <td className="td font-bold">{money(totals.charged)}</td>
                  <td className="td font-bold text-sage">{money(totals.collected)}</td>
                  <td className="td font-bold text-danger">{money(totals.services)}</td>
                  <td className="td font-bold text-danger">{money(totals.maintenance)}</td>
                  <td className={`td font-bold ${totals.net >= 0 ? "text-sage" : "text-danger"}`}>{money(totals.net)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "payments" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1">
              {["all", "pending", "overdue", "paid"].map((f) => (
                <button key={f} onClick={() => setPayFilter(f)}
                  className={`rounded-lg px-3 py-1.5 text-sm capitalize ${payFilter === f ? "bg-blue text-white font-semibold" : "border border-white/15 text-ink/60"}`}>
                  {f}
                </button>
              ))}
            </div>
            <button className="btn" onClick={() => setChargeForm({ contract_id: activeContract?.id ?? "", due_date: today, amount: activeContract?.monthly_rent ?? "", notes: "" })}>
              + Record charge
            </button>
          </div>

          {chargeForm && (
            <div className="card p-4 grid gap-3 md:grid-cols-2">
              <div><span className="label">Lease</span>
                <select className="input" value={chargeForm.contract_id} onChange={(e) => setChargeForm({ ...chargeForm, contract_id: e.target.value })}>
                  <option value="">Select…</option>
                  {contracts.map((c) => <option key={c.id} value={c.id}>{c.tenants?.full_name} · {fmtDate(c.start_date)}</option>)}
                </select></div>
              <div><span className="label">Due date</span><input type="date" className="input" value={chargeForm.due_date} onChange={(e) => setChargeForm({ ...chargeForm, due_date: e.target.value })} /></div>
              <div><span className="label">Amount</span><input type="number" className="input" value={chargeForm.amount} onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })} /></div>
              <div><span className="label">Notes</span><input className="input" value={chargeForm.notes} onChange={(e) => setChargeForm({ ...chargeForm, notes: e.target.value })} placeholder="Late fee, prorated rent…" /></div>
              <div className="md:col-span-2 flex gap-2 justify-end">
                <button className="btn-ghost" onClick={() => setChargeForm(null)}>Cancel</button>
                <button className="btn" onClick={saveCharge}>Add charge</button>
              </div>
            </div>
          )}

          {settleForm && (
            <div className="card p-4 grid gap-3 md:grid-cols-4">
              <div className="md:col-span-4 text-sm text-ink/60">
                Registering payment of <b className="text-ink">{money(settleForm.amount)}</b> due {fmtDate(settleForm.due_date)}
              </div>
              <div><span className="label">Paid on</span><input type="date" className="input" value={settleForm.paid_date} onChange={(e) => setSettleForm({ ...settleForm, paid_date: e.target.value })} /></div>
              <div><span className="label">Method</span>
                <select className="input" value={settleForm.method} onChange={(e) => setSettleForm({ ...settleForm, method: e.target.value })}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
                </select></div>
              <div className="md:col-span-2"><span className="label">Notes</span><input className="input" value={settleForm.notes ?? ""} onChange={(e) => setSettleForm({ ...settleForm, notes: e.target.value })} /></div>
              <div className="md:col-span-4 flex gap-2 justify-end">
                <button className="btn-ghost" onClick={() => setSettleForm(null)}>Cancel</button>
                <button className="btn" onClick={settle}>Save payment</button>
              </div>
            </div>
          )}

          <div className="card overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead><tr><th className="th">Due date</th><th className="th">Tenant</th><th className="th">Amount</th><th className="th">Status</th><th className="th">Method</th><th className="th"></th></tr></thead>
              <tbody>
                {payments.filter((p) => payFilter === "all" || payState(p) === payFilter).map((p) => {
                  const s = payState(p);
                  return (
                    <tr key={p.id}>
                      <td className="td">{fmtDate(p.due_date)}{p.paid_date && <p className="text-xs text-sage">Paid {fmtDate(p.paid_date)}</p>}</td>
                      <td className="td">{tenantOf(p.contract_id)}{p.notes && <p className="text-xs text-ink/40">{p.notes}</p>}</td>
                      <td className="td font-semibold">{money(p.amount)}</td>
                      <td className="td"><span className={`badge ${payBadge(s)}`}>{s}</span></td>
                      <td className="td text-ink/60">{p.method ? PAYMENT_METHOD_LABELS[p.method] ?? p.method : "—"}</td>
                      <td className="td text-right whitespace-nowrap">
                        {s === "paid"
                          ? <button className="btn-ghost mr-1" onClick={() => unsettle(p)}>Undo</button>
                          : <button className="btn-ghost mr-1" onClick={() => setSettleForm({ ...p, paid_date: today, method: activeContract?.payment_method ?? "zelle" })}>Mark paid</button>}
                        <button className="btn-ghost text-danger" onClick={() => removeRow("payments", p.id, "payment")}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
                {payments.length === 0 && (
                  <tr><td className="td text-ink/50" colSpan={6}>No payments yet. Generate them from a lease in the Contracts tab.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "services" && (
        <div className="space-y-3">
          {servicesMissing ? (
            <div className="card p-4 border-gold/40">
              <p className="font-bold text-gold">Service accounts table not created yet</p>
              <p className="text-sm text-ink/60 mt-1">
                Run <code className="text-ink">supabase/migrations/001_property_accounts.sql</code> in
                Supabase → SQL Editor to start tracking each utility account (provider, account number, billing day).
                Logged bills below already work.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-bold">Service accounts</h2>
                <button className="btn" onClick={() => setServiceForm(emptyService())}>+ New account</button>
              </div>

              {serviceForm && (
                <div className="card p-4 grid gap-3 md:grid-cols-2">
                  <div><span className="label">Service</span>
                    <select className="input" value={serviceForm.category} onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}>
                      {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_LABELS[c]}</option>)}
                    </select></div>
                  <div><span className="label">Provider</span><input className="input" value={serviceForm.provider ?? ""} onChange={(e) => setServiceForm({ ...serviceForm, provider: e.target.value })} placeholder="FPL, Miami-Dade Water…" /></div>
                  <div><span className="label">Account number</span><input className="input" value={serviceForm.account_number ?? ""} onChange={(e) => setServiceForm({ ...serviceForm, account_number: e.target.value })} /></div>
                  <div><span className="label">Billing day</span><input type="number" min={1} max={31} className="input" value={serviceForm.billing_day ?? ""} onChange={(e) => setServiceForm({ ...serviceForm, billing_day: e.target.value })} /></div>
                  <div><span className="label">Monthly estimate</span><input type="number" className="input" value={serviceForm.monthly_estimate ?? ""} onChange={(e) => setServiceForm({ ...serviceForm, monthly_estimate: e.target.value })} /></div>
                  <div><span className="label">Paid by</span>
                    <select className="input" value={serviceForm.paid_by} onChange={(e) => setServiceForm({ ...serviceForm, paid_by: e.target.value })}>
                      <option value="owner">Owner</option><option value="tenant">Tenant</option>
                    </select></div>
                  <div><span className="label">Status</span>
                    <select className="input" value={serviceForm.status} onChange={(e) => setServiceForm({ ...serviceForm, status: e.target.value })}>
                      <option value="active">Active</option><option value="cancelled">Cancelled</option>
                    </select></div>
                  <div><span className="label">Notes</span><input className="input" value={serviceForm.notes ?? ""} onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })} /></div>
                  <div className="md:col-span-2 flex gap-2 justify-end">
                    <button className="btn-ghost" onClick={() => setServiceForm(null)}>Cancel</button>
                    <button className="btn" onClick={saveService}>{serviceForm.id ? "Save changes" : "Create account"}</button>
                  </div>
                </div>
              )}

              <div className="card overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead><tr><th className="th">Service</th><th className="th">Provider / account</th><th className="th">Billing</th><th className="th">Estimate</th><th className="th">Paid by</th><th className="th"></th></tr></thead>
                  <tbody>
                    {services.map((s) => (
                      <tr key={s.id} className={s.status === "cancelled" ? "opacity-50" : ""}>
                        <td className="td font-semibold">{EXPENSE_LABELS[s.category] ?? s.category}</td>
                        <td className="td">{s.provider || "—"}<p className="text-xs text-ink/50">{s.account_number || "no account #"}</p></td>
                        <td className="td">{s.billing_day ? `Day ${s.billing_day}` : "—"}</td>
                        <td className="td">{money(s.monthly_estimate)}</td>
                        <td className="td capitalize">{s.paid_by}</td>
                        <td className="td text-right whitespace-nowrap">
                          <button className="btn-ghost mr-1" onClick={() => setBillForm(emptyBill(s.category))}>Log bill</button>
                          <button className="btn-ghost mr-1" onClick={() => setServiceForm(s)}>Edit</button>
                          <button className="btn-ghost text-danger" onClick={() => removeRow("property_services", s.id, "service account")}>Delete</button>
                        </td>
                      </tr>
                    ))}
                    {services.length === 0 && (
                      <tr><td className="td text-ink/50" colSpan={6}>No service accounts yet. Add water, electricity, trash, WiFi or HOA.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-2">
            <h2 className="font-bold">Bills paid in {year}</h2>
            <button className="btn" onClick={() => setBillForm(emptyBill())}>+ Log bill</button>
          </div>

          {billForm && (
            <div className="card p-4 grid gap-3 md:grid-cols-2">
              <div><span className="label">Service</span>
                <select className="input" value={billForm.category} onChange={(e) => setBillForm({ ...billForm, category: e.target.value })}>
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_LABELS[c]}</option>)}
                </select></div>
              <div><span className="label">Amount</span><input type="number" className="input" value={billForm.amount} onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })} /></div>
              <div><span className="label">Date</span><input type="date" className="input" value={billForm.expense_date} onChange={(e) => setBillForm({ ...billForm, expense_date: e.target.value })} /></div>
              <div><span className="label">Notes</span><input className="input" value={billForm.notes ?? ""} onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })} /></div>
              <div className="md:col-span-2 flex gap-2 justify-end">
                <button className="btn-ghost" onClick={() => setBillForm(null)}>Cancel</button>
                <button className="btn" onClick={saveBill}>{billForm.id ? "Save changes" : "Log bill"}</button>
              </div>
            </div>
          )}

          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead><tr><th className="th">Date</th><th className="th">Service</th><th className="th">Amount</th><th className="th"></th></tr></thead>
              <tbody>
                {yearBills.map((b) => (
                  <tr key={b.id}>
                    <td className="td">{fmtDate(b.expense_date)}</td>
                    <td className="td font-semibold">{EXPENSE_LABELS[b.category] ?? b.category}{b.notes && <p className="text-xs text-ink/50">{b.notes}</p>}</td>
                    <td className="td font-semibold text-danger">{money(b.amount)}</td>
                    <td className="td text-right whitespace-nowrap">
                      <button className="btn-ghost mr-1" onClick={() => setBillForm(b)}>Edit</button>
                      <button className="btn-ghost text-danger" onClick={() => removeRow("expenses", b.id, "bill")}>Delete</button>
                    </td>
                  </tr>
                ))}
                {yearBills.length === 0 && <tr><td className="td text-ink/50" colSpan={4}>No bills logged for {year}.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "maintenance" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{openRequests.length} open · {requests.length} total</h2>
            <button className="btn" onClick={() => setRequestForm(emptyRequest())}>+ New request</button>
          </div>

          {requestForm && (
            <div className="card p-4 grid gap-3 md:grid-cols-2">
              <div><span className="label">Category</span>
                <select className="input" value={requestForm.category} onChange={(e) => setRequestForm({ ...requestForm, category: e.target.value })}>
                  {MAINTENANCE_CATEGORIES.map((c) => <option key={c} value={c}>{MAINTENANCE_LABELS[c]}</option>)}
                </select></div>
              <div><span className="label">Priority</span>
                <select className="input" value={requestForm.priority} onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}>
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select></div>
              <div className="md:col-span-2"><span className="label">Description</span><input className="input" value={requestForm.description} onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })} placeholder="Master bedroom A/C not cooling" /></div>
              <div><span className="label">Status</span>
                <select className="input" value={requestForm.status} onChange={(e) => setRequestForm({ ...requestForm, status: e.target.value })}>
                  <option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option>
                </select></div>
              <div><span className="label">Reported date</span><input type="date" className="input" value={requestForm.reported_date} onChange={(e) => setRequestForm({ ...requestForm, reported_date: e.target.value })} /></div>
              <div><span className="label">Cost</span><input type="number" className="input" value={requestForm.cost ?? ""} onChange={(e) => setRequestForm({ ...requestForm, cost: e.target.value })} /></div>
              <div className="md:col-span-2 flex gap-2 justify-end">
                <button className="btn-ghost" onClick={() => setRequestForm(null)}>Cancel</button>
                <button className="btn" onClick={saveRequest}>{requestForm.id ? "Save changes" : "Create request"}</button>
              </div>
            </div>
          )}

          <div className="card overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead><tr><th className="th">Request</th><th className="th">Priority</th><th className="th">Status</th><th className="th">Cost</th><th className="th"></th></tr></thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td className="td">
                      <span className="badge bg-white/10 mr-2">{MAINTENANCE_LABELS[r.category] ?? r.category}</span>{r.description}
                      <p className="text-xs text-ink/50">Reported {fmtDate(r.reported_date)}{r.resolved_date && ` · Resolved ${fmtDate(r.resolved_date)}`}</p>
                    </td>
                    <td className="td capitalize">{r.priority}</td>
                    <td className="td">
                      <span className={`badge ${r.status === "resolved" ? "bg-sage/15 text-sage" : r.status === "in_progress" ? "bg-gold/15 text-gold" : "bg-danger/15 text-danger"}`}>
                        {r.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="td">{money(r.cost)}</td>
                    <td className="td text-right whitespace-nowrap">
                      {r.status !== "resolved" && <button className="btn-ghost mr-1" onClick={() => resolveRequest(r)}>Resolve</button>}
                      <button className="btn-ghost mr-1" onClick={() => setRequestForm({ ...r, cost: r.cost ?? "" })}>Edit</button>
                      <button className="btn-ghost text-danger" onClick={() => removeRow("maintenance_requests", r.id, "request")}>Delete</button>
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && <tr><td className="td text-ink/50" colSpan={5}>No maintenance recorded for this property.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "contracts" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{contracts.length} lease(s) on this property</h2>
            <Link href="/leases" className="btn">+ New lease</Link>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead><tr><th className="th">Tenant</th><th className="th">Term</th><th className="th">Rent / deposit</th><th className="th">Status</th><th className="th"></th></tr></thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id}>
                    <td className="td"><p className="font-semibold">{c.tenants?.full_name}</p><p className="text-xs text-ink/50">{c.tenants?.phone || c.tenants?.email || "—"}</p></td>
                    <td className="td">{fmtDate(c.start_date)} → {fmtDate(c.end_date)}<p className="text-xs text-ink/50">Due day {c.payment_day}</p></td>
                    <td className="td font-semibold">{money(c.monthly_rent)}<p className="text-xs text-ink/50">Deposit {money(c.deposit)}</p></td>
                    <td className="td">
                      <span className={`badge ${c.status === "active" ? "bg-sage/15 text-sage" : "bg-white/10 text-ink/50"}`}>{c.status}</span>
                      <span className={`badge ml-1 ${c.signed ? "bg-sage/15 text-sage" : "bg-gold/15 text-gold"}`}>{c.signed ? "Signed" : "Unsigned"}</span>
                    </td>
                    <td className="td text-right whitespace-nowrap">
                      <button className="btn-ghost mr-1" onClick={() => downloadContract(c)} disabled={busy === c.id}>
                        {busy === c.id ? "Generating…" : "Contract"}
                      </button>
                      <button className="btn-ghost mr-1" onClick={() => runGeneratePayments(c)}>Generate payments</button>
                      <button className="btn-ghost" onClick={() => copyPortalLink(c)}>Portal link</button>
                    </td>
                  </tr>
                ))}
                {contracts.length === 0 && <tr><td className="td text-ink/50" colSpan={5}>No leases yet for this property.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "documents" && (
        <div className="card p-4">
          <h2 className="font-bold mb-3">Documents</h2>
          <PropertyDocuments propertyId={id} />
        </div>
      )}
    </div>
  );
}
