"use client";
import { useEffect, useState } from "react";
import { supabase, money, fmtDate } from "@/lib/supabase";

function buildMessage(p: any, e: string) {
  const tenant = p.contracts?.tenants?.full_name?.split(" ")[0] ?? "there";
  const property = p.contracts?.properties?.name ?? "your unit";
  const amount = money(p.amount);
  const due = fmtDate(p.due_date);
  const wave = "\u{1F44B}";
  const smile = "\u{1F60A}";
  const pray = "\u{1F64F}";
  if (e === "overdue") {
    return `Hi ${tenant}! ${wave} Just a gentle reminder that the ${amount} rent payment for ${property} was due on ${due} and we haven't received it yet. If you've already sent it, just let us know! Otherwise, whenever you get a chance, we'd really appreciate it. ${pray}`;
  }
  return `Hi ${tenant}! ${smile} Just a friendly reminder that the ${amount} rent payment for ${property} will be due on ${due}. Whenever you have a chance, please let us know once the payment has been sent.\nThank you so much! We really appreciate it. ${pray}`;
}

function digitsOnly(phone: string) {
  return (phone || "").replace(/[^0-9+]/g, "");
}

export default function Payments() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const today = new Date().toISOString().slice(0, 10);

  const load = async () => {
    const { data } = await supabase
      .from("payments")
      .select("*, contracts(properties(name), tenants(full_name, email, phone))")
      .order("due_date", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const markPaid = async (p: any) => {
    await supabase.from("payments").update({ status: "paid", paid_date: today }).eq("id", p.id);
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this payment?")) return;
    await supabase.from("payments").delete().eq("id", id);
    load();
  };

  const state = (p: any) => (p.status === "paid" ? "paid" : p.due_date < today ? "overdue" : "pending");
  const visible = items.filter((p) => (filter === "all" ? true : state(p) === filter));
  const totalOverdue = items.filter((p) => state(p) === "overdue").reduce((s, p) => s + Number(p.amount), 0);

  const badge = (e: string) =>
    e === "paid" ? "bg-sage/15 text-sage" : e === "overdue" ? "bg-danger/15 text-danger" : "bg-gold/15 text-gold";

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-ink/50">
            {totalOverdue > 0 ? <span className="text-danger font-semibold">Overdue: {money(totalOverdue)}</span> : "Nothing overdue"}
          </p>
        </div>
        <div className="flex gap-1">
          {["all", "pending", "overdue", "paid"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize ${filter === f ? "bg-blue text-white font-semibold" : "border border-white/15 text-ink/60"}`}>
              {f}
            </button>
          ))}
        </div>
      </header>
      <p className="text-xs text-ink/40">Payments are generated from each lease with the "Generate payments" button.</p>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead><tr><th className="th">Property / Tenant</th><th className="th">Due date</th><th className="th">Amount</th><th className="th">Status</th><th className="th"></th></tr></thead>
          <tbody>
            {visible.map((p) => {
              const e = state(p);
              const tenant = p.contracts?.tenants;
              const msg = buildMessage(p, e);
              const phone = digitsOnly(tenant?.phone);
              return (
                <tr key={p.id}>
                  <td className="td"><p className="font-semibold">{p.contracts?.properties?.name}</p><p className="text-xs text-ink/50">{tenant?.full_name}</p></td>
                  <td className="td">{fmtDate(p.due_date)}{p.paid_date && <p className="text-xs text-sage">Paid {fmtDate(p.paid_date)}</p>}</td>
                  <td className="td font-semibold">{money(p.amount)}</td>
                  <td className="td"><span className={`badge ${badge(e)}`}>{e}</span></td>
                  <td className="td text-right whitespace-nowrap">
                    {e !== "paid" && (
                      <>
                        {phone && (
                          <a className="btn-ghost mr-1" title="WhatsApp"
                            href={`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`}
                            target="_blank" rel="noopener noreferrer">WhatsApp</a>
                        )}
                        {phone && (
                          <a className="btn-ghost mr-1" title="SMS"
                            href={`sms:${phone}?&body=${encodeURIComponent(msg)}`}>SMS</a>
                        )}
                        {tenant?.email && (
                          <a className="btn-ghost mr-1" title="Email"
                            href={`mailto:${tenant.email}?subject=${encodeURIComponent("Rent reminder")}&body=${encodeURIComponent(msg)}`}>Email</a>
                        )}
                        <button className="btn-ghost mr-1" onClick={() => markPaid(p)}>Mark paid</button>
                      </>
                    )}
                    <button className="btn-ghost text-danger" onClick={() => remove(p.id)}>Delete</button>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && <tr><td className="td text-ink/50" colSpan={5}>No payments in this view.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}