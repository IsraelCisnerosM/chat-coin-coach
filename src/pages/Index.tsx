import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { PortfolioSummary } from "@/components/PortfolioSummary";
import { AIProfile } from "@/components/AIProfile";
import { AIChat } from "@/components/AIChat";
import { PendingTasks } from "@/components/PendingTasks";
import { MarketInsights } from "@/components/MarketInsights";

const Index = () => {
  const [riskProfile] = useState<"Conservative" | "Moderate" | "Aggressive">("Moderate");
  
  const portfolioData = {
    totalValue: 45_823.67,
    performance: 12.34,
    distribution: [
      { name: "Bitcoin", value: 35, color: "hsl(43, 96%, 56%)" },
      { name: "Ethereum", value: 30, color: "hsl(214, 95%, 50%)" },
      { name: "Stablecoins", value: 20, color: "hsl(142, 76%, 36%)" },
      { name: "Other", value: 15, color: "hsl(270, 70%, 60%)" },
    ],
  };

  const pendingTasks = [
    {
      id: "1",
      title: "Scheduled Purchase",
      type: "buy" as const,
      amount: "0.1",
      token: "ETH",
      network: "Ethereum Mainnet",
      gasEstimate: "$2.45",
      createdAt: new Date(),
    },
  ];

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

  const handleApproveTask = (taskId: string) => {
    toast({
      title: "Transaction Approved",
      description: "Your transaction is being processed on the blockchain.",
    });
  };

  const handleCancelTask = (taskId: string) => {
    toast({
      title: "Task Cancelled",
      description: "The pending transaction has been cancelled.",
      variant: "destructive",
    });
  };

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
          <PortfolioSummary {...portfolioData} />
          <AIProfile riskProfile={riskProfile} onEdit={handleEditProfile} />
          <MarketInsights insights={marketInsights} />
        </div>

        {/* Center Column - AI Chat */}
        <div className="lg:col-span-2 space-y-6">
          <AIChat />
          <PendingTasks 
            tasks={pendingTasks}
            onApprove={handleApproveTask}
            onCancel={handleCancelTask}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
