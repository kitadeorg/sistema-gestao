import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CONDO.",
  description: "Sistema de gestão de condomínios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-pt"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--background)] selection:bg-orange-500/30">
        {/* Se este for o layout principal que envolve a Sidebar, 
          deixamos o flex aqui. Se for apenas o Root, o conteúdo 
          dentro dos Dashboards cuidará do container.
        */}
        <div className="relative flex min-h-screen flex-col">
          {children}
        </div>
        <Toaster
          position="bottom-right"
          duration={3000}
          richColors
          closeButton
        />
      </body>
    </html>
  );
}