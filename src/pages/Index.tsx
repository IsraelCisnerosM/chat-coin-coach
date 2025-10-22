import { useState } from "react";
import { Eye, EyeOff, Send, Download, Receipt, Coffee, ArrowDownLeft, ShoppingCart, Smartphone, ArrowUpRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";

const Index = () => {
  const [showBalance, setShowBalance] = useState(true);
  const [chatInput, setChatInput] = useState("");

  const suggestions = [
    "¿En que invertir el día de hoy?",
    "Enviar dinero o Pagar servicios",
    "¿Cómo van mis finanzas?"
  ];

  const transactions = [
    { icon: Coffee, description: "Rampa por Ethereum", date: "Hoy, 10:30", amount: -70000.50 },
    { icon: ArrowDownLeft, description: "Orden efectuada en compra de activo", date: "Ayer, 15:45", amount: -1250.00 },
    { icon: ShoppingCart, description: "Pago de Despensa", date: "Ayer, 12:20", amount: -4302.75 },
    { icon: Smartphone, description: "Pago de Servicio - Celular", date: "15 Oct", amount: -299.00 },
    { icon: ArrowUpRight, description: "Transferencia a María Tienda de la esquina", date: "14 Oct", amount: -500.00 }
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setChatInput(suggestion);
  };

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Balance Card */}
      <div className="mx-4 mt-4 p-6 rounded-3xl bg-gradient-card shadow-glow relative overflow-hidden">
        {/* Overlay de brillo */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        
        {/* Contenido */}
        <div className="relative z-10">
          {/* Header Row */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-primary-foreground/80">Saldo Disponible</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setShowBalance(!showBalance)}
            >
              {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>

          {/* Sección de Saldo */}
          <div className="mb-4">
            <div className="text-4xl font-bold text-primary-foreground">
              {showBalance ? "2500000.00 ETH" : "••••••••"}
            </div>
            <div className="text-sm text-primary-foreground/60 mt-1">Ethereum</div>
          </div>

          {/* Botón de Acción */}
          <Button
            size="sm"
            variant="outline"
            className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20"
          >
            Ver Detalle
          </Button>
        </div>
      </div>

      {/* AI Chat (Bloky) */}
      <div className="mx-4 mt-6 p-4 rounded-3xl bg-muted shadow-md">
        {/* Avatar y Nombre */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10 bg-accent rounded-full p-2">
            <MessageCircle className="h-5 w-5 text-accent-foreground" />
          </Avatar>
          <span className="font-semibold text-foreground">Bloky</span>
        </div>

        {/* Mensaje de Bienvenida */}
        <div className="rounded-2xl p-3 bg-card mb-3">
          <p className="text-sm text-muted-foreground">Hola, ¿en qué puedo ayudarte hoy?</p>
        </div>

        {/* Botones de Sugerencias */}
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              size="sm"
              variant="outline"
              className="bg-card text-xs"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>

        {/* Input de Chat */}
        <div className="flex gap-2">
          <Input
            placeholder="Pregunta a tu agente..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="bg-card border-muted-foreground/20"
          />
          <Button size="icon" variant="gradient" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="px-4 mt-6">
        {/* Header de Sección */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg text-foreground">Transacciones Recientes</h2>
          <Button variant="link" size="sm" className="text-accent">
            Ver Todas
          </Button>
        </div>

        {/* Tarjeta de Transacciones */}
        <Card className="rounded-3xl shadow-md overflow-hidden">
          {transactions.map((transaction, index) => {
            const Icon = transaction.icon;
            return (
              <div key={index}>
                <div className="flex items-center gap-3 p-4">
                  {/* Ícono circular */}
                  <div className="rounded-full bg-muted p-2">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>

                  {/* Información */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">
                      {transaction.description}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {transaction.date}
                    </div>
                  </div>

                  {/* Monto */}
                  <div className="font-bold text-sm text-foreground">
                    ${Math.abs(transaction.amount).toFixed(2)}
                  </div>
                </div>
                {index < transactions.length - 1 && (
                  <div className="border-b border-muted mx-4" />
                )}
              </div>
            );
          })}
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="px-4 mt-6 pb-24">
        <div className="grid grid-cols-3 gap-3">
          <Button variant="secondary" className="flex-col h-auto py-4 gap-2">
            <Send className="h-6 w-6" />
            <span className="text-xs font-medium">Enviar</span>
          </Button>

          <Button variant="action" className="flex-col h-auto py-4 gap-2">
            <Receipt className="h-6 w-6" />
            <span className="text-xs font-medium">Servicios</span>
          </Button>

          <Button
            variant="outline"
            className="flex-col h-auto py-4 gap-2 bg-pink-pale border-accent/20"
          >
            <Download className="h-6 w-6" />
            <span className="text-xs font-medium">Recibir</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
