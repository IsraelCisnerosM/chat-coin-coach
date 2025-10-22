import { useState } from "react";
import { MessageCircle, Coffee, CreditCard, Lightbulb, ArrowRight, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Educacion() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const suggestions = [
    "¿Cómo están mis gastos?",
    "¿Cuánto puedo ahorrar?",
    "Consejos para mi presupuesto"
  ];

  const handleSendMessage = async (message?: string) => {
    const messageToSend = message || input;
    if (!messageToSend.trim() || isLoading) return;

    setShowSuggestions(false);
    const userMessage: Message = { role: "user", content: messageToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const isFirstMessage = messages.length === 0;
      
      const { data, error } = await supabase.functions.invoke('education-chat', {
        body: { 
          message: messageToSend, 
          history: messages,
          isFirstMessage 
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response || "Lo siento, no pude procesar tu solicitud."
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Log para debugging de task e insight
      if (data.task) {
        console.log('📋 Tarea generada:', data.task);
      }
      if (data.insight) {
        console.log('💡 Insight generado:', data.insight);
      }
      if (data.intencion) {
        console.log('🎯 Intención detectada:', data.intencion);
      }
    } catch (error) {
      console.error('Error en chat educativo:', error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Disculpa, hubo un error al procesar tu mensaje. Por favor intenta de nuevo."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(0,0%,98%)] pb-20 p-6">
      {/* Título Principal */}
      <h1 className="text-3xl font-bold text-[hsl(263,68%,20%)] mb-6">
        ¿Cómo van mis finanzas?
      </h1>

      {/* Chatbot Bloky Health */}
      <Card className="bg-[hsl(291,47%,88%)] rounded-2xl p-6 shadow-md mb-8 border-0">
        {/* Header del Chatbot */}
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full p-2 bg-[hsl(259,59%,46%)]">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[hsl(263,68%,20%)]">
              Hola, soy Bloky Health
            </h2>
            <p className="text-sm text-[hsl(263,68%,33%)]">
              Estoy aquí para ayudarte a entender tu dinero. ¿Qué te gustaría revisar hoy?
            </p>
          </div>
        </div>

        {/* Área de Mensajes */}
        {messages.length > 0 && (
          <ScrollArea className="h-[300px] bg-white rounded-lg p-4 mb-4">
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`rounded-2xl p-3 max-w-[80%] ${
                      msg.role === "user"
                        ? "bg-[hsl(259,59%,46%)] text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl p-3 bg-gray-100">
                    <Loader2 className="h-4 w-4 animate-spin text-[hsl(259,59%,46%)]" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Botones de Sugerencias */}
        {showSuggestions && (
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestions.map((suggestion, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => handleSendMessage(suggestion)}
                className="rounded-full bg-white border-[hsl(291,64%,62%)] text-[hsl(259,59%,46%)] text-xs hover:bg-[hsl(291,47%,88%)]"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}

        {/* Barra de Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Pregúntame sobre tus finanzas..."
            className="bg-white border-[hsl(291,64%,62%)] rounded-lg focus:ring-[hsl(259,59%,46%)]"
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={() => handleSendMessage()}
            disabled={isLoading || !input.trim()}
            className="shrink-0 bg-[hsl(259,59%,46%)] hover:bg-[hsl(263,68%,33%)] text-white rounded-lg"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </Card>

      {/* Sección "Tu Resumen Educativo" */}
      <h2 className="text-2xl font-bold text-[hsl(263,68%,20%)] mb-4">
        Tu Resumen Educativo
      </h2>

      <div className="space-y-4">
        {/* Tarjeta 1: Oportunidad de Ahorro */}
        <Card className="bg-[hsl(340,82%,92%)] border-0 rounded-xl shadow-sm p-4">
          <div className="flex items-start gap-4">
            <div className="rounded-full p-3 bg-pink-100">
              <Coffee className="h-6 w-6 text-pink-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[hsl(263,68%,20%)] mb-1">
                Oportunidad de Ahorro
              </h3>
              <p className="text-sm text-[hsl(263,68%,33%)] mb-2">
                Has gastado 450 ETH en cafés este mes. Reducir a 3 veces por semana podría ahorrarte 200 ETH mensuales.
              </p>
              <button className="flex items-center gap-1 text-[hsl(259,59%,46%)] text-sm font-medium hover:gap-2 transition-all">
                Ver más
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>

        {/* Tarjeta 2: Plan de Pago Inteligente */}
        <Card className="bg-[hsl(291,47%,88%)] border-0 rounded-xl shadow-sm p-4">
          <div className="flex items-start gap-4">
            <div className="rounded-full p-3 bg-[hsl(291,47%,88%)]">
              <CreditCard className="h-6 w-6 text-[hsl(259,59%,46%)]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[hsl(263,68%,20%)] mb-1">
                Plan de Pago Inteligente
              </h3>
              <p className="text-sm text-[hsl(263,68%,33%)] mb-2">
                Al pagar 50 ETH extra a tu tarjeta cada mes, podrías ahorrar 800 ETH en intereses este año.
              </p>
              <button className="flex items-center gap-1 text-[hsl(259,59%,46%)] text-sm font-medium hover:gap-2 transition-all">
                Ver más
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>

        {/* Tarjeta 3: Consejo de Inversión */}
        <Card className="bg-[hsl(291,47%,88%)] border-0 rounded-xl shadow-sm p-4">
          <div className="flex items-start gap-4">
            <div className="rounded-full p-3 bg-[hsl(291,47%,88%)]">
              <Lightbulb className="h-6 w-6 text-[hsl(259,59%,46%)]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[hsl(263,68%,20%)] mb-1">
                Consejo de Inversión
              </h3>
              <p className="text-sm text-[hsl(263,68%,33%)] mb-2">
                Tienes 1,200 ETH disponibles. Considera invertir el 20% en un fondo de emergencia para mayor seguridad.
              </p>
              <button className="flex items-center gap-1 text-[hsl(259,59%,46%)] text-sm font-medium hover:gap-2 transition-all">
                Ver más
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
