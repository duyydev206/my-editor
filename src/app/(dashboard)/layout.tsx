import React from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Mock */}
      <aside className="w-64 border-r bg-muted/20 hidden md:block">
        <div className="p-4 border-b font-semibold">Jira Clone</div>
        <nav className="p-4 space-y-2">
          {/* Navigation Links would go here */}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {/* Topbar Mock */}
        <header className="h-14 border-b flex items-center px-4">
          <div className="font-medium">Dashboard</div>
        </header>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
