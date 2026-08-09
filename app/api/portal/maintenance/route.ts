import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { propertyId, category, description } = await req.json();
  if (!propertyId || !description) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const { error } = await supabaseAdmin.from("maintenance_requests").insert({
    property_id: propertyId,
    category: category || "other",
    description,
    priority: "medium",
    status: "open",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
