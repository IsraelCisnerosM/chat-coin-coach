import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Inversiones from "./pages/Inversiones";
import Transacciones from "./pages/Transacciones";
import Educacion from "./pages/Educacion";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Página de Auth sin Layout */}
            <Route path="/" element={<Auth />} />
            
            {/* Páginas protegidas con Layout */}
            <Route path="/home" element={
              <ProtectedRoute>
                <Layout><Index /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/inversiones" element={
              <ProtectedRoute>
                <Layout><Inversiones /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/transacciones" element={
              <ProtectedRoute>
                <Layout><Transacciones /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/educacion" element={
              <ProtectedRoute>
                <Layout><Educacion /></Layout>
              </ProtectedRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
