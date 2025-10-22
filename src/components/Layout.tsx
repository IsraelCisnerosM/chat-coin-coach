import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isHome = location.pathname === "/home";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col w-full">
          {/* Header */}
          <header className={`h-14 border-b flex items-center px-4 sticky top-0 z-10 ${isHome ? 'bg-[hsl(0,0%,98%)] border-[hsl(291,64%,62%)]/20' : 'bg-card border-border'}`}>
            <SidebarTrigger className="mr-4" />
            <h1 className={`text-lg font-semibold ${isHome ? 'text-[hsl(263,68%,20%)]' : 'text-foreground'}`}>Blocky</h1>
          </header>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
