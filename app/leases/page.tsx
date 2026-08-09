"use client";
import { useEffect, useState } from "react";
import { supabase, money, fmtDate } from "@/lib/supabase";

const empty = { property_id: "", tenant_id: "", start_date: "", end_date: "", monthly_rent: "", deposit: "", payment_day: 5, status: "active" };

export default function Leases() {
  const [items, setItems] = useState<any[]>([]);
  const [props, setProps] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const [c, p, t] = await Promise.all([
      supabase.from("contracts").select("*, properties(name), tenants(full_name)").order("created_at", { ascending: false }),
      supabase.from("properties").select("id,name").order("name"),
      supabase.from("tenants").select("id,full_name").order("full_name"),
    ]);
    setItems(c.data ?? []); setProps(p.data ?? []); setTenants(t.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.property_id || !form.tenant_id || !form.start_date || !form.monthly_rent)
      return alert("Property, tenant, start date and rent are required");
    const payload = {
      ...form,
      end_date: form.end_date || null,
      monthly_rent: Number(form.monthly_rent),
      deposit: Number(form.deposit) || 0,
      payment_day: Number(form.payment_day) || 5,
    };
    delete payload.properties; delete payload.tenants;
    const { error } = form.id
      ? await supabase.from("contracts").update(payload).eq("id", form.id)
      : await supabase.from("contracts").insert(payload);
    if (error) return alert(error.message);
    if (!form.id) await supabase.from("properties").update({ status: "rented" }).eq("id", form.property_id);
    setForm(empty); setOpen(false); load();
  };

  const generatePayments = async (c: any) => {
    const { data: existing } = await supabase
      .from("payments")
      .select("id")
      .eq("contract_id", c.id);
    if (existing && existing.length > 0) {
      const replace = confirm(
        `This lease already has ${existing.length} payment(s) generated. Press OK to DELETE them and generate a fresh set, or Cancel to keep the existing ones.`
      );
      if (!replace) return;
      await supabase.from("payments").delete().eq("contract_id", c.id);
    } const n = Number(prompt("How many months of payments to generate from the lease start?", "12"));
    if (!n || n < 1) return;
    const start = new Date(c.start_date + "T00:00:00");
    const rows = Array.from({ length: n }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth() + i, c.payment_day || 5);
      return { contract_id: c.id, due_date: d.toISOString().slice(0, 10), amount: c.monthly_rent, status: "pending" };
    });
    const { error } = await supabase.from("payments").insert(rows);
    alert(error ? error.message : `${n} payments generated. Check them in Payments.`);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete lease? Its payments will also be deleted.")) return;
    await supabase.from("contracts").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Leases</h1><p className="text-sm text-ink/50">{items.filter((c) => c.status === "active").length} active</p></div>
        <button className="btn" onClick={() => { setForm(empty); setOpen(true); }}>+ New</button>
      </header>

      {open && (
        <div className="card p-4 grid gap-3 md:grid-cols-2">
          <div><span className="label">Property</span>
            <select className="input" value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}>
              <option value="">Select…</option>{props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div><span className="label">Tenant</span>
            <select className="input" value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}>
              <option value="">Select…</option>{tenants.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select></div>
          <div><span className="label">Start date</span><input type="date" className="input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
          <div><span className="label">End date (optional)</span><input type="date" className="input" value={form.end_date ?? ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
          <div><span className="label">Monthly rent</span><input type="number" className="input" value={form.monthly_rent} onChange={(e) => setForm({ ...form, monthly_rent: e.target.value })} /></div>
          <div><span className="label">Security deposit</span><input type="number" className="input" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} /></div>
          <div><span className="label">Payment day (1–28)</span><input type="number" min={1} max={28} className="input" value={form.payment_day} onChange={(e) => setForm({ ...form, payment_day: e.target.value })} /></div>
          <div><span className="label">Status</span>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option><option value="ended">Ended</option>
            </select></div>
          <div className="md:col-span-2 flex gap-2 justify-end">
            <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn" onClick={save}>{form.id ? "Save changes" : "Create lease"}</button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead><tr><th className="th">Property / Tenant</th><th className="th">Term</th><th className="th">Rent</th><th className="th">Status</th><th className="th"></th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td className="td"><p className="font-semibold">{c.properties?.name}</p><p className="text-xs text-ink/50">{c.tenants?.full_name}</p></td>
                <td className="td">{fmtDate(c.start_date)} → {fmtDate(c.end_date)}<p className="text-xs text-ink/50">Due day {c.payment_day}</p></td>
                <td className="td font-semibold">{money(c.monthly_rent)}</td>
                <td className="td"><span className={`badge ${c.status === "active" ? "bg-sage/15 text-sage" : "bg-white/10 text-ink/50"}`}>{c.status}</span></td>
                <td className="td text-right whitespace-nowrap">
                  <button className="btn-ghost mr-1" onClick={() => generatePayments(c)}>Generate payments</button>
                  <button className="btn-ghost mr-1" onClick={() => { setForm(c); setOpen(true); }}>Edit</button>
                  <button className="btn-ghost text-danger" onClick={() => remove(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td className="td text-ink/50" colSpan={5}>No leases yet. You need at least one property and one tenant.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
