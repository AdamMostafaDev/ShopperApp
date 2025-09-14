import AdminHeader from "@/components/AdminHeader";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminHeader />
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}