import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { PortfolioSummary } from "@/components/PortfolioSummary";
import { AIProfile } from "@/components/AIProfile";
import { AIChat } from "@/components/AIChat";
import { PendingTasks } from "@/components/PendingTasks";
import { MarketInsights } from "@/components/MarketInsights";
import { Brain, Wallet, TrendingUp } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

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
    <div className="min-h-screen">
      {/* Hero Section */}
      <div 
        className="relative h-[300px] bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-accent/60 backdrop-blur-sm" />
        <div className="relative h-full container mx-auto px-4 flex flex-col justify-center">
          <div className="max-w-3xl animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="h-12 w-12 text-primary-foreground" />
              <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground">
                AI Investment Platform
              </h1>
            </div>
            <p className="text-xl text-primary-foreground/90 max-w-2xl">
              Blockchain-powered investing made simple with conversational AI. No technical knowledge required.
            </p>
            <div className="flex gap-3 mt-6">
              <Button size="lg" variant="secondary" className="shadow-lg">
                <Wallet className="mr-2 h-5 w-5" />
                Connect Wallet
              </Button>
              <Button size="lg" variant="outline" className="bg-card/50 backdrop-blur-sm border-primary-foreground/30 text-primary-foreground hover:bg-card/80">
                <TrendingUp className="mr-2 h-5 w-5" />
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
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
    </div>
  );
};

export default Index;
