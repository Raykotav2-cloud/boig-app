"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const empty = { full_name: "", email: "", phone: "", id_number: "" };

export default function Tenants() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("tenants").select("*").order("full_name");
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.full_name) return alert("Full name is required");
    const { error } = form.id
      ? await supabase.from("tenants").update(form).eq("id", form.id)
      : await supabase.from("tenants").insert(form);
    if (error) return alert(error.message);
    setForm(empty); setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete tenant? Their leases and payments will also be deleted.")) return;
    await supabase.from("tenants").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Tenants</h1><p className="text-sm text-ink/50">{items.length} on record</p></div>
        <button className="btn" onClick={() => { setForm(empty); setOpen(true); }}>+ New</button>
      </header>

      {open && (
        <div className="card p-4 grid gap-3 md:grid-cols-2">
          <div><span className="label">Full name</span><input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><span className="label">ID / Document</span><input className="input" value={form.id_number ?? ""} onChange={(e) => setForm({ ...form, id_number: e.target.value })} /></div>
          <div><span className="label">Email</span><input className="input" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><span className="label">Phone</span><input className="input" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="md:col-span-2 flex gap-2 justify-end">
            <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn" onClick={save}>{form.id ? "Save changes" : "Create tenant"}</button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead><tr><th className="th">Name</th><th className="th">Document</th><th className="th">Contact</th><th className="th"></th></tr></thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id}>
                <td className="td font-semibold">{t.full_name}</td>
                <td className="td">{t.id_number || "—"}</td>
                <td className="td"><p>{t.email || "—"}</p><p className="text-xs text-ink/50">{t.phone}</p></td>
                <td className="td text-right whitespace-nowrap">
                  <button className="btn-ghost mr-1" onClick={() => { setForm(t); setOpen(true); }}>Edit</button>
                  <button className="btn-ghost text-danger" onClick={() => remove(t.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td className="td text-ink/50" colSpan={4}>No tenants yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
