import { TrendingUp, TrendingDown, DollarSign, PieChart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface PortfolioData {
  totalValue: number;
  performance: number;
  distribution: { name: string; value: number; color: string }[];
}

export const PortfolioSummary = () => {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);

  useEffect(() => {
    fetch('/portfolio-data.json')
      .then(res => res.json())
      .then(data => setPortfolioData(data))
      .catch(err => console.error('Error loading portfolio data:', err));
  }, []);

  if (!portfolioData) {
    return (
      <Card className="p-6 shadow-[var(--shadow-card)] animate-fade-in">
        <div className="text-center text-muted-foreground">Cargando...</div>
      </Card>
    );
  }

  const { totalValue, performance, distribution } = portfolioData;
  const isPositive = performance >= 0;

  return (
    <Card className="p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all animate-fade-in">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Valor del Portafolio</h2>
          <DollarSign className="h-5 w-5 text-primary" />
        </div>
        
        <div className="space-y-2">
          <div className="text-3xl font-bold text-foreground">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-secondary" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            <span className={`text-sm font-medium ${isPositive ? 'text-secondary' : 'text-destructive'}`}>
              {isPositive ? '+' : ''}{performance.toFixed(2)}%
            </span>
            <span className="text-sm text-muted-foreground">cambio 24h</span>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Distribución de Activos</span>
          </div>
          
          <div className="space-y-2">
            {distribution.map((asset, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: asset.color }}
                  />
                  <span className="text-sm text-foreground">{asset.name}</span>
                </div>
                <span className="text-sm font-medium text-foreground">{asset.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};
