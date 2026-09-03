import { supabase } from "./supabase";

// Creates one pending payment per month, starting at the lease start date.
// Returns a message to show the user, or null when they cancelled.
export async function generatePaymentsForContract(contract: any): Promise<string | null> {
  const { data: existing } = await supabase.from("payments").select("id").eq("contract_id", contract.id);
  if (existing && existing.length > 0) {
    const replace = confirm(
      `This lease already has ${existing.length} payment(s) generated. Press OK to DELETE them and generate a fresh set, or Cancel to keep the existing ones.`
    );
    if (!replace) return null;
    await supabase.from("payments").delete().eq("contract_id", contract.id);
  }
  const n = Number(prompt("How many months of payments to generate from the lease start?", "12"));
  if (!n || n < 1) return null;
  const start = new Date(contract.start_date + "T00:00:00");
  const rows = Array.from({ length: n }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth() + i, contract.payment_day || 5);
    return { contract_id: contract.id, due_date: d.toISOString().slice(0, 10), amount: contract.monthly_rent, status: "pending" };
  });
  const { error } = await supabase.from("payments").insert(rows);
  return error ? error.message : `${n} monthly payments generated.`;
}
