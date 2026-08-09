import "./globals.css";
import AuthGate from "@/components/AuthGate";

export const metadata = {
  title: "BOIG · Property Management",
  description: "Berthet-Ortega Investment Group · Rentals, payments, expenses and maintenance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
