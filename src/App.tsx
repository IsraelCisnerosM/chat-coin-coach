import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Inversiones from "./pages/Inversiones";
import Transacciones from "./pages/Transacciones";
import Educacion from "./pages/Educacion";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Página de Auth sin Layout */}
          <Route path="/" element={<Auth />} />
          
          {/* Páginas con Layout */}
          <Route path="/home" element={<Layout><Index /></Layout>} />
          <Route path="/inversiones" element={<Layout><Inversiones /></Layout>} />
          <Route path="/transacciones" element={<Layout><Transacciones /></Layout>} />
          <Route path="/educacion" element={<Layout><Educacion /></Layout>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
