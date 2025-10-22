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
      title: "High volatility detected in Bitcoin",
      description: "AI analysis shows increased market volatility. Consider adjusting your risk exposure.",
      sentiment: "neutral" as const,
      confidence: 87,
      timestamp: new Date(),
    },
    {
      id: "2",
      title: "Ethereum upgrade approaching",
      description: "Market sentiment is bullish ahead of the upcoming network upgrade. Historical data suggests potential upside.",
      sentiment: "bullish" as const,
      confidence: 92,
      timestamp: new Date(),
    },
  ];

  const handleEditProfile = () => {
    toast({
      title: "Opening AI Profile Editor",
      description: "Chat with the AI to adjust your investment profile.",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Portfolio & Profile */}
        <div className="space-y-6">
          <PortfolioSummary />
          <AIProfile riskProfile={riskProfile} onEdit={handleEditProfile} />
          <MarketInsights insights={marketInsights} />
        </div>

        {/* Center Column - AI Chat */}
        <div className="lg:col-span-2 space-y-6">
          <AIChat />
          <PendingTasks />
        </div>
      </div>
    </div>
  );
};

export default Index;
