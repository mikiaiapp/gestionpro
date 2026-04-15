import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";

const syne = Syne({ 
  subsets: ["latin"],
  variable: '--font-syne',
});

const dmSans = DM_Sans({ 
  subsets: ["latin"],
  variable: '--font-dm-sans',
});

export const metadata: Metadata = {
  title: "GestiónPro | Gestión Profesional",
  description: "Sistema avanzado de gestión de proyectos y facturación",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${dmSans.variable} ${syne.variable} font-sans antialiased text-[var(--foreground)] bg-[var(--background)]`}>
        <main className="min-h-screen container-fluid pl-0">
          {children}
        </main>
      </body>
    </html>
  );
}
