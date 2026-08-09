"use client";
import { useEffect, useState } from "react";
import { supabase, money, fmtDate, MAINTENANCE_CATEGORIES } from "@/lib/supabase";

const LABELS: Record<string, string> = { ac: "A/C", plumbing: "Plumbing", electrical: "Electrical", paint: "Paint", other: "Other" };
const empty = { property_id: "", category: "ac", description: "", priority: "medium", status: "open", reported_date: new Date().toISOString().slice(0, 10), cost: "" };

export default function Maintenance() {
  const [items, setItems] = useState<any[]>([]);
  const [props, setProps] = useState<any[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const [m, p] = await Promise.all([
      supabase.from("maintenance_requests").select("*, properties(name)").order("reported_date", { ascending: false }),
      supabase.from("properties").select("id,name").order("name"),
    ]);
    setItems(m.data ?? []); setProps(p.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.property_id || !form.description) return alert("Property and description are required");
    const payload = { ...form, cost: form.cost === "" ? null : Number(form.cost) };
    delete payload.properties;
    const { error } = form.id
      ? await supabase.from("maintenance_requests").update(payload).eq("id", form.id)
      : await supabase.from("maintenance_requests").insert(payload);
    if (error) return alert(error.message);
    setForm(empty); setOpen(false); load();
  };

  const resolve = async (m: any) => {
    await supabase.from("maintenance_requests").update({ status: "resolved", resolved_date: new Date().toISOString().slice(0, 10) }).eq("id", m.id);
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this request?")) return;
    await supabase.from("maintenance_requests").delete().eq("id", id);
    load();
  };

  const badge = (s: string) =>
    s === "resolved" ? "bg-sage/15 text-sage" : s === "in_progress" ? "bg-gold/15 text-gold" : "bg-danger/15 text-danger";

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Maintenance</h1><p className="text-sm text-ink/50">{items.filter((m) => m.status !== "resolved").length} open requests</p></div>
        <button className="btn" onClick={() => { setForm(empty); setOpen(true); }}>+ New request</button>
      </header>

      {open && (
        <div className="card p-4 grid gap-3 md:grid-cols-2">
          <div><span className="label">Property</span>
            <select className="input" value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}>
              <option value="">Select…</option>{props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div><span className="label">Category</span>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {MAINTENANCE_CATEGORIES.map((c) => <option key={c} value={c}>{LABELS[c]}</option>)}
            </select></div>
          <div className="md:col-span-2"><span className="label">Description</span><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Master bedroom A/C not cooling" /></div>
          <div><span className="label">Priority</span>
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select></div>
          <div><span className="label">Status</span>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option>
            </select></div>
          <div><span className="label">Reported date</span><input type="date" className="input" value={form.reported_date} onChange={(e) => setForm({ ...form, reported_date: e.target.value })} /></div>
          <div><span className="label">Cost (optional)</span><input type="number" className="input" value={form.cost ?? ""} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
          <div className="md:col-span-2 flex gap-2 justify-end">
            <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn" onClick={save}>{form.id ? "Save changes" : "Create request"}</button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead><tr><th className="th">Request</th><th className="th">Property</th><th className="th">Priority</th><th className="th">Status</th><th className="th">Cost</th><th className="th"></th></tr></thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id}>
                <td className="td"><span className="badge bg-white/10 mr-2">{LABELS[m.category] ?? m.category}</span>{m.description}<p className="text-xs text-ink/50">Reported {fmtDate(m.reported_date)}{m.resolved_date && ` · Resolved ${fmtDate(m.resolved_date)}`}</p></td>
                <td className="td font-semibold">{m.properties?.name}</td>
                <td className="td capitalize">{m.priority}</td>
                <td className="td"><span className={`badge ${badge(m.status)}`}>{m.status.replace("_", " ")}</span></td>
                <td className="td">{money(m.cost)}</td>
                <td className="td text-right whitespace-nowrap">
                  {m.status !== "resolved" && <button className="btn-ghost mr-1" onClick={() => resolve(m)}>Resolve</button>}
                  <button className="btn-ghost mr-1" onClick={() => { setForm(m); setOpen(true); }}>Edit</button>
                  <button className="btn-ghost text-danger" onClick={() => remove(m.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td className="td text-ink/50" colSpan={6}>No maintenance requests yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
