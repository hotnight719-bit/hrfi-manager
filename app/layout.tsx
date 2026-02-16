
import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google"; // Remove if unused in original, or keep? Original didn't have it.
import "./globals.css";
import { TeamProvider } from "@/context/TeamContext";
import Navbar from "@/components/Navbar";
// import { Toaster } from "@/components/ui/toaster"; // If Toaster exists? Check components.

export const metadata: Metadata = {
  title: "HR FI",
  description: "Human Resource Financial Intelligence",
};

import { getTeams } from "@/lib/teams";
import { auth } from "@/auth";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const user = session?.user || null;
  // console.log("RootLayout: Fetching teams...");
  const teams = await getTeams();
  console.log("RootLayout: Teams fetched:", teams.length);
  console.log("RootLayout rendered");

  return (
    <html lang="ko">
      <body className="antialiased font-sans">
        <TeamProvider initialTeams={teams}>
          <Navbar user={user} />
          <main className="container mx-auto p-4">
            {children}
          </main>
          {/* <Toaster /> */}
        </TeamProvider>
      </body>
    </html>
  );
}
