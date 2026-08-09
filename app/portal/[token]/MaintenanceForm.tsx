"use client";
import { useState } from "react";

const CATS = ["ac", "plumbing", "electrical", "paint", "other"];
const LABELS: Record<string, string> = { ac: "A/C", plumbing: "Plumbing", electrical: "Electrical", paint: "Paint", other: "Other" };

export default function MaintenanceForm({ propertyId }: { propertyId: string }) {
  const [category, setCategory] = useState("ac");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async () => {
    if (!description.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/portal/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, category, description }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
      setDescription("");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="card p-4">
        <h2 className="font-bold mb-1">Report an issue</h2>
        <p className="text-sm text-sage font-semibold">Thanks! Your request has been sent.</p>
        <button className="btn-ghost mt-2" onClick={() => setStatus("idle")}>Send another</button>
      </div>
    );
  }

  return (
    <div className="card p-4 space-y-2">
      <h2 className="font-bold">Report an issue</h2>
      <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATS.map((c) => <option key={c} value={c}>{LABELS[c]}</option>)}
      </select>
      <textarea className="input" rows={3} placeholder="Describe the issue…"
        value={description} onChange={(e) => setDescription(e.target.value)} />
      <button className="btn w-full justify-center" disabled={status === "sending"} onClick={submit}>
        {status === "sending" ? "Sending…" : "Submit request"}
      </button>
      {status === "error" && <p className="text-sm text-danger">Something went wrong. Please try again.</p>}
    </div>
  );
}
