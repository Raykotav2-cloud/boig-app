"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const BUCKET = "documents";

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Files live in the "documents" storage bucket under <propertyId>/<timestamp>-<name>
export default function PropertyDocuments({ propertyId }: { propertyId: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(propertyId, { sortBy: { column: "created_at", order: "desc" } });
    if (error) { alert(error.message); return; }
    setDocs(data ?? []);
  }, [propertyId]);

  useEffect(() => { load(); }, [load]);

  const upload = async (file: File) => {
    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const { error } = await supabase.storage.from(BUCKET).upload(`${propertyId}/${Date.now()}-${safeName}`, file);
    setUploading(false);
    if (error) return alert(error.message);
    load();
  };

  const view = async (name: string) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(`${propertyId}/${name}`, 60);
    if (error || !data) return alert(error?.message ?? "Could not open file");
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (name: string) => {
    if (!confirm("Delete this document?")) return;
    await supabase.storage.from(BUCKET).remove([`${propertyId}/${name}`]);
    load();
  };

  return (
    <div className="space-y-2">
      <label className="btn-ghost cursor-pointer inline-block">
        {uploading ? "Uploading…" : "+ Upload document"}
        <input type="file" className="hidden" disabled={uploading}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </label>
      {docs.length === 0 ? (
        <p className="text-sm text-ink/40">No documents uploaded yet. Signed leases, invoices, receipts…</p>
      ) : (
        <ul className="space-y-1">
          {docs.map((d) => (
            <li key={d.name} className="flex items-center justify-between text-sm border-t border-white/5 pt-1.5 first:border-0 first:pt-0">
              <span className="truncate">
                {d.name.replace(/^\d+-/, "")}
                <span className="text-xs text-ink/40 ml-2">{fmtSize(d.metadata?.size ?? 0)}</span>
              </span>
              <span className="whitespace-nowrap">
                <button className="btn-ghost mr-1" onClick={() => view(d.name)}>View</button>
                <button className="btn-ghost text-danger" onClick={() => remove(d.name)}>Delete</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
