import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AuthGate from "@/components/AuthGate";

export const metadata = {
  title: "BOIG · Property Management",
  description: "Berthet-Ortega Investment Group · Rentals, payments, expenses and maintenance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthGate>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">{children}</main>
          </div>
        </AuthGate>
      </body>
    </html>
  );
}
