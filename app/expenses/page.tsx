"use client";
import { useEffect, useState } from "react";
import { supabase, money, fmtDate, EXPENSE_CATEGORIES, EXPENSE_LABELS as LABELS } from "@/lib/supabase";
const empty = { property_id: "", category: "water", amount: "", expense_date: new Date().toISOString().slice(0, 10), notes: "" };

export default function Expenses() {
  const [items, setItems] = useState<any[]>([]);
  const [props, setProps] = useState<any[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const [g, p] = await Promise.all([
      supabase.from("expenses").select("*, properties(name)").order("expense_date", { ascending: false }),
      supabase.from("properties").select("id,name").order("name"),
    ]);
    setItems(g.data ?? []); setProps(p.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.property_id || !form.amount) return alert("Property and amount are required");
    const payload = { ...form, amount: Number(form.amount) };
    delete payload.properties;
    const { error } = form.id
      ? await supabase.from("expenses").update(payload).eq("id", form.id)
      : await supabase.from("expenses").insert(payload);
    if (error) return alert(error.message);
    setForm(empty); setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    load();
  };

  const month = new Date().toISOString().slice(0, 7);
  const byCategory = EXPENSE_CATEGORIES.map((c) => ({
    c,
    total: items.filter((g) => g.category === c && g.expense_date?.startsWith(month)).reduce((s, g) => s + Number(g.amount), 0),
  })).filter((x) => x.total > 0);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Expenses</h1><p className="text-sm text-ink/50">Water, electricity, trash, WiFi, HOA</p></div>
        <button className="btn" onClick={() => { setForm(empty); setOpen(true); }}>+ Add</button>
      </header>

      {byCategory.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {byCategory.map((x) => (
            <span key={x.c} className="card px-3 py-1.5 text-sm"><span className="text-ink/50">{LABELS[x.c]} (month):</span> <b>{money(x.total)}</b></span>
          ))}
        </div>
      )}

      {open && (
        <div className="card p-4 grid gap-3 md:grid-cols-2">
          <div><span className="label">Property</span>
            <select className="input" value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}>
              <option value="">Select…</option>{props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div><span className="label">Category</span>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{LABELS[c]}</option>)}
            </select></div>
          <div><span className="label">Amount</span><input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div><span className="label">Date</span><input type="date" className="input" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
          <div className="md:col-span-2"><span className="label">Notes</span><input className="input" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="md:col-span-2 flex gap-2 justify-end">
            <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn" onClick={save}>{form.id ? "Save changes" : "Add expense"}</button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead><tr><th className="th">Date</th><th className="th">Property</th><th className="th">Category</th><th className="th">Amount</th><th className="th"></th></tr></thead>
          <tbody>
            {items.map((g) => (
              <tr key={g.id}>
                <td className="td">{fmtDate(g.expense_date)}</td>
                <td className="td font-semibold">{g.properties?.name}</td>
                <td className="td">{LABELS[g.category] ?? g.category}{g.notes && <p className="text-xs text-ink/50">{g.notes}</p>}</td>
                <td className="td font-semibold">{money(g.amount)}</td>
                <td className="td text-right whitespace-nowrap">
                  <button className="btn-ghost mr-1" onClick={() => { setForm(g); setOpen(true); }}>Edit</button>
                  <button className="btn-ghost text-danger" onClick={() => remove(g.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td className="td text-ink/50" colSpan={5}>No expenses recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
