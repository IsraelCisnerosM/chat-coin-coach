import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, DollarSign, Receipt, History } from "lucide-react";
import { TransactionChat } from "@/components/TransactionChat";
import { supabase } from "@/integrations/supabase/client";

export default function Transacciones() {
  const [balance, setBalance] = useState(0);
  const [movements, setMovements] = useState<any[]>([]);

  useEffect(() => {
    // Cargar saldo del portafolio
    const loadBalance = async () => {
      try {
        const response = await fetch('/portfolio-data.json');
        const data = await response.json();
        setBalance(data.totalValue);
      } catch (error) {
        console.error('Error cargando saldo:', error);
      }
    };

    loadBalance();
  }, []);

  useEffect(() => {
    // Cargar movimientos desde Supabase
    const loadMovements = async () => {
      const { data, error } = await supabase
        .from('movements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error cargando movimientos:', error);
      } else {
        setMovements(data || []);
      }
    };

    loadMovements();

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('movements-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'movements'
        },
        () => {
          loadMovements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleQuickAction = (action: string) => {
    // Esta funcionalidad se manejará a través del chat
    console.log('Quick action:', action);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Encabezado con Saldo */}
      <Card className="p-6 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Saldo Total</p>
          <h1 className="text-4xl font-bold text-foreground">
            ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h1>
        </div>
      </Card>

      {/* Panel de Botones */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          variant="outline"
          size="lg"
          className="h-24 flex flex-col items-center justify-center gap-2"
          onClick={() => handleQuickAction('transfer')}
        >
          <Send className="h-6 w-6" />
          <span>Transferencia Rápida</span>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-24 flex flex-col items-center justify-center gap-2"
          onClick={() => handleQuickAction('payment')}
        >
          <DollarSign className="h-6 w-6" />
          <span>Pago de Servicios</span>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-24 flex flex-col items-center justify-center gap-2"
          onClick={() => handleQuickAction('history')}
        >
          <History className="h-6 w-6" />
          <span>Ver Movimientos</span>
        </Button>
      </div>

      {/* Chat de Transacciones */}
      <TransactionChat />

      {/* Historial de Movimientos */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Receipt className="h-6 w-6" />
          Historial de Movimientos
        </h2>
        <div className="space-y-4">
          {movements.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay movimientos registrados
            </p>
          ) : (
            movements.map((movement) => (
              <div
                key={movement.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    movement.type === 'transfer' ? 'bg-blue-500/20' :
                    movement.type === 'service_payment' ? 'bg-purple-500/20' :
                    'bg-green-500/20'
                  }`}>
                    {movement.type === 'transfer' ? '↗️' : 
                     movement.type === 'service_payment' ? '💳' : '↙️'}
                  </div>
                  <div>
                    <p className="font-semibold">
                      {movement.type === 'transfer' 
                        ? `Transferencia a ${movement.recipient_name || movement.recipient_email}`
                        : movement.type === 'service_payment'
                        ? `Pago de ${movement.service_name}`
                        : 'Recepción'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(movement.created_at).toLocaleString('es-ES')}
                    </p>
                    {movement.description && (
                      <p className="text-sm text-muted-foreground">{movement.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {movement.amount} {movement.token}
                  </p>
                  <p className="text-sm text-muted-foreground">{movement.network}</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                    movement.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                    movement.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                    'bg-red-500/20 text-red-500'
                  }`}>
                    {movement.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
