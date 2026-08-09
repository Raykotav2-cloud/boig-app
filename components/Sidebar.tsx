"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const links = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/properties", label: "Properties", icon: "⌂" },
  { href: "/tenants", label: "Tenants", icon: "☺" },
  { href: "/leases", label: "Leases", icon: "✎" },
  { href: "/payments", label: "Payments", icon: "$" },
  { href: "/expenses", label: "Expenses", icon: "↧" },
  { href: "/maintenance", label: "Maintenance", icon: "⚒" },
  { href: "/reports", label: "Reports", icon: "▤" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-16 md:w-60 shrink-0 bg-black border-r border-white/10 flex flex-col">
      <div className="px-2 md:px-4 py-5 flex flex-col items-center">
        <Image src="/logo.png" alt="BOIG · Berthet-Ortega Investment Group" width={160} height={160}
          className="w-10 md:w-32 h-auto rounded-lg" priority />
        <p className="hidden md:block mt-2 text-[10px] uppercase tracking-[0.2em] text-gold/80 text-center">
          Imagine · Invest · Improve
        </p>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {links.map((l) => {
          const active = path === l.href;
          return (
            <Link key={l.href} href={l.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active ? "bg-blue text-white font-semibold" : "text-ink/60 hover:bg-inkSoft hover:text-ink"
              }`}>
              <span className="w-4 text-center">{l.icon}</span>
              <span className="hidden md:inline">{l.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-2 md:px-4 py-4 border-t border-white/5 text-center">
        <button onClick={() => supabase.auth.signOut()}
          className="text-xs text-ink/50 hover:text-danger transition-colors">
          <span className="md:hidden">⎋</span>
          <span className="hidden md:inline">Sign out</span>
        </button>
        <p className="hidden md:block mt-2 text-[11px] text-gold/50">Berthet-Ortega Investment Group</p>
      </div>
    </aside>
  );
}
