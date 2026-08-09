"use client";
import { useEffect, useState } from "react";
import { supabase, money } from "@/lib/supabase";

const empty = { name: "", address: "", type: "apartment", bedrooms: 1, bathrooms: 1, monthly_rent: "", status: "available" };

export default function Properties() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name || !form.address) return alert("Name and address are required");
    const payload = { ...form, monthly_rent: Number(form.monthly_rent) || 0 };
    const { error } = form.id
      ? await supabase.from("properties").update(payload).eq("id", form.id)
      : await supabase.from("properties").insert(payload);
    if (error) return alert(error.message);
    setForm(empty); setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this property? Its leases, payments and expenses will also be deleted.")) return;
    await supabase.from("properties").delete().eq("id", id);
    load();
  };

  const badge = (s: string) =>
    s === "rented" ? "bg-sage/15 text-sage" : s === "maintenance" ? "bg-gold/15 text-gold" : "bg-white/10 text-ink/70";

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Properties</h1>
          <p className="text-sm text-ink/50">{items.length} in portfolio</p>
        </div>
        <button className="btn" onClick={() => { setForm(empty); setOpen(true); }}>+ New</button>
      </header>

      {open && (
        <div className="card p-4 grid gap-3 md:grid-cols-2">
          <div><span className="label">Name</span><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Unit 302 Brickell" /></div>
          <div><span className="label">Address</span><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><span className="label">Type</span>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="apartment">Apartment</option><option value="house">House</option><option value="commercial">Commercial</option><option value="other">Other</option>
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><span className="label">Bedrooms</span><input type="number" className="input" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: Number(e.target.value) })} /></div>
            <div><span className="label">Bathrooms</span><input type="number" className="input" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: Number(e.target.value) })} /></div>
          </div>
          <div><span className="label">Monthly rent</span><input type="number" className="input" value={form.monthly_rent} onChange={(e) => setForm({ ...form, monthly_rent: e.target.value })} /></div>
          <div><span className="label">Status</span>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="available">Available</option><option value="rented">Rented</option><option value="maintenance">Under maintenance</option>
            </select></div>
          <div className="md:col-span-2 flex gap-2 justify-end">
            <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn" onClick={save}>{form.id ? "Save changes" : "Create property"}</button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead><tr><th className="th">Property</th><th className="th">Type</th><th className="th">Rent</th><th className="th">Status</th><th className="th"></th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td className="td"><p className="font-semibold">{p.name}</p><p className="text-xs text-ink/50">{p.address}</p></td>
                <td className="td capitalize">{p.type} · {p.bedrooms}BD/{p.bathrooms}BA</td>
                <td className="td font-semibold">{money(p.monthly_rent)}</td>
                <td className="td"><span className={`badge ${badge(p.status)}`}>{p.status}</span></td>
                <td className="td text-right whitespace-nowrap">
                  <button className="btn-ghost mr-1" onClick={() => { setForm(p); setOpen(true); }}>Edit</button>
                  <button className="btn-ghost text-danger" onClick={() => remove(p.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td className="td text-ink/50" colSpan={5}>No properties yet. Create your first one with "+ New".</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
