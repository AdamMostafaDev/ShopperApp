import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard - UniShopper",
  description: "Admin panel for UniShopper",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}