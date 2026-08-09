"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    setError(""); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError("Invalid email or password.");
  };

  if (session === undefined)
    return <div className="min-h-screen bg-paper flex items-center justify-center text-ink/50">Loading…</div>;

  if (!session)
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="card w-full max-w-sm p-8 text-center">
          <Image src="/logo.png" alt="BOIG" width={140} height={140} className="mx-auto rounded-lg" priority />
          <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-gold/80">Imagine · Invest · Improve</p>
          <div className="mt-6 space-y-3 text-left">
            <div>
              <span className="label">Email</span>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <span className="label">Password</span>
              <input className="input" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && signIn()} />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button className="btn w-full justify-center" onClick={signIn} disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    );

  return <>{children}</>;
}
