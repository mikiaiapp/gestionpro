import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
        <main className="min-h-screen bg-black overflow-x-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
