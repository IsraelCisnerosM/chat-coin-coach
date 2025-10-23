import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isHome = location.pathname === "/home";
  const { signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col w-full">
          {/* Header */}
          <header className="h-14 border-b border-border bg-card flex items-center px-4 sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <h1 className="text-lg font-semibold text-foreground flex-1">Blocky</h1>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={signOut}
              className="ml-auto"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </header>

          {/* Main Content */}
          <main className={`flex-1 ${isHome ? 'bg-[hsl(0,0%,98%)]' : ''}`}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
