import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { money, fmtDate } from "@/lib/supabase";
import MaintenanceForm from "./MaintenanceForm";

export default async function PortalPage({ params }: { params: { token: string } }) {
  const contractId = params.token;

  const { data: contract } = await supabaseAdmin
    .from("contracts")
    .select("*, properties(id,name,address), tenants(full_name)")
    .eq("id", contractId)
    .single();

  if (!contract) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-6 text-center">
        <p className="text-ink/60">This link isn't valid. Please contact your property manager.</p>
      </div>
    );
  }

  const { data: payments } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("contract_id", contractId)
    .order("due_date", { ascending: false });

  const today = new Date().toISOString().slice(0, 10);
  const list = payments ?? [];
  const overdue = list.filter((p) => p.status !== "paid" && p.due_date < today);
  const upcoming = list.filter((p) => p.status !== "paid" && p.due_date >= today).slice(-1)[0];

  return (
    <div className="min-h-screen bg-paper text-ink p-4 md:p-8">
      <div className="max-w-xl mx-auto space-y-6">
        <header className="text-center space-y-1">
          <img src="/logo.png" alt="BOIG" className="w-16 h-16 mx-auto rounded-lg" />
          <h1 className="text-xl font-bold">Hi {contract.tenants?.full_name?.split(" ")[0] ?? "there"}!</h1>
          <p className="text-sm text-ink/50">{contract.properties?.name} — {contract.properties?.address}</p>
        </header>

        <div className="card p-4">
          <h2 className="font-bold mb-2">Your rent</h2>
          <p className="text-sm text-ink/60">
            Monthly rent: <span className="font-semibold text-ink">{money(contract.monthly_rent)}</span>
          </p>
          {overdue.length > 0 ? (
            <p className="text-sm text-danger font-semibold mt-2">
              You have {overdue.length} overdue payment(s) totaling {money(overdue.reduce((s, p) => s + Number(p.amount), 0))}.
            </p>
          ) : upcoming ? (
            <p className="text-sm text-gold font-semibold mt-2">Next payment due {fmtDate(upcoming.due_date)}.</p>
          ) : (
            <p className="text-sm text-sage font-semibold mt-2">You're all caught up!</p>
          )}
        </div>

        <div className="card p-4">
          <h2 className="font-bold mb-2">Payment history</h2>
          {list.length === 0 ? (
            <p className="text-sm text-ink/40">No payments on file yet.</p>
          ) : (
            <ul className="space-y-1">
              {list.slice(0, 12).map((p) => (
                <li key={p.id} className="flex justify-between text-sm border-t border-white/5 pt-1.5 first:border-0 first:pt-0">
                  <span>{fmtDate(p.due_date)}</span>
                  <span className={p.status === "paid" ? "text-sage" : p.due_date < today ? "text-danger" : "text-gold"}>
                    {money(p.amount)} · {p.status === "paid" ? "Paid" : p.due_date < today ? "Overdue" : "Pending"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <MaintenanceForm propertyId={contract.property_id} />

        <p className="text-center text-[11px] text-ink/30">Berthet-Ortega Investment Group</p>
      </div>
    </div>
  );
}
