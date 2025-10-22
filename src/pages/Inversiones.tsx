import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { PortfolioSummary } from "@/components/PortfolioSummary";
import { AIProfile } from "@/components/AIProfile";
import { AIChat } from "@/components/AIChat";
import { PendingTasks } from "@/components/PendingTasks";
import { MarketInsights } from "@/components/MarketInsights";

const Index = () => {
  const [riskProfile] = useState<"Conservative" | "Moderate" | "Aggressive">("Moderate");

  const marketInsights = [
    {
      id: "1",
      title: "Alta volatilidad detectada en Bitcoin",
      description: "El análisis de IA muestra mayor volatilidad del mercado. Considera ajustar tu exposición al riesgo.",
      sentiment: "neutral" as const,
      confidence: 87,
      timestamp: new Date(),
    },
    {
      id: "2",
      title: "Actualización de Ethereum aproximándose",
      description: "El sentimiento del mercado es alcista antes de la próxima actualización de red. Los datos históricos sugieren potencial al alza.",
      sentiment: "bullish" as const,
      confidence: 92,
      timestamp: new Date(),
    },
  ];

  const handleEditProfile = () => {
    toast({
      title: "Abriendo Editor de Perfil IA",
      description: "Chatea con la IA para ajustar tu perfil de inversión.",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-[hsl(240,12%,6%)]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Portfolio & Profile */}
        <div className="space-y-6">
          <PortfolioSummary />
          <AIProfile riskProfile={riskProfile} onEdit={handleEditProfile} />
          <MarketInsights insights={marketInsights} />
        </div>

        {/* Center Column - AI Chat */}
        <div className="lg:col-span-2 space-y-6">
          <AIChat 
            assistantName="Blocky Autopilot" 
            inputClassName="text-white placeholder:text-white/70"
          />
          <PendingTasks />
        </div>
      </div>
    </div>
  );
};

export default Index;
