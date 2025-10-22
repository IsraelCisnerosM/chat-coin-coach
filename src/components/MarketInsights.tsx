import { TrendingUp, AlertCircle, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Insight {
  id: string;
  title: string;
  description: string;
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  timestamp: Date;
}

interface MarketInsightsProps {
  insights: Insight[];
}

export const MarketInsights = ({ insights }: MarketInsightsProps) => {
  const getSentimentConfig = (sentiment: Insight["sentiment"]) => {
    switch (sentiment) {
      case "bullish":
        return { color: "bg-secondary/10 text-secondary", icon: TrendingUp };
      case "bearish":
        return { color: "bg-destructive/10 text-destructive", icon: AlertCircle };
      case "neutral":
        return { color: "bg-muted text-muted-foreground", icon: Sparkles };
    }
  };

  return (
    <Card className="p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all animate-fade-in">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">AI Market Insights</h2>
          <Badge variant="secondary" className="text-xs">Live</Badge>
        </div>

        <div className="space-y-3">
          {insights.map((insight) => {
            const config = getSentimentConfig(insight.sentiment);
            const Icon = config.icon;

            return (
              <div
                key={insight.id}
                className="p-4 rounded-lg border border-border bg-gradient-to-br from-card to-muted/20 hover:border-primary/30 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-foreground text-sm">{insight.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {insight.confidence}% confidence
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                    
                    <div className="flex items-center justify-between pt-2">
                      <Badge className={config.color}>
                        {insight.sentiment.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {insight.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
