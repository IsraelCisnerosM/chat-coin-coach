import { Shield, TrendingUp, Scale } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AIProfileProps {
  riskProfile: "Conservative" | "Moderate" | "Aggressive";
  onEdit: () => void;
}

const profileConfig = {
  Conservative: {
    icon: Shield,
    color: "text-secondary",
    bgColor: "bg-secondary/10",
    description: "Enfoque en inversiones estables y de bajo riesgo",
  },
  Moderate: {
    icon: Scale,
    color: "text-primary",
    bgColor: "bg-primary/10",
    description: "Enfoque equilibrado entre riesgo y recompensa",
  },
  Aggressive: {
    icon: TrendingUp,
    color: "text-accent",
    bgColor: "bg-accent/10",
    description: "Estrategia de inversión de alto riesgo y alta recompensa",
  },
};

export const AIProfile = ({ riskProfile, onEdit }: AIProfileProps) => {
  const config = profileConfig[riskProfile];
  const Icon = config.icon;

  return (
    <Card className="p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all animate-fade-in">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Mi Perfil de Inversor IA</h2>
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">{riskProfile}</span>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
              IA Detectada
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>

        <Button 
          variant="outline" 
          onClick={onEdit}
          className="w-full"
        >
          Ajustar Perfil con IA
        </Button>
      </div>
    </Card>
  );
};
