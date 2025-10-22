import { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, Brain, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import aiAvatar from "@/assets/ai-avatar.png";

// Detectar si estamos en modo local o nube
const IS_LOCAL = import.meta.env.DEV && import.meta.env.VITE_USE_LOCAL_PYTHON === 'true';
const LOCAL_PYTHON_URL = import.meta.env.VITE_LOCAL_PYTHON_URL || 'http://localhost:8000';

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  task?: {
    id: string;
    title: string;
    type: string;
    amount: string;
    token: string;
    network: string;
    gasEstimate: string;
  };
}

interface QuickAction {
  label: string;
  prompt: string;
}

const quickActions: QuickAction[] = [
  { label: "Analyze my portfolio", prompt: "How is my portfolio performing today?" },
  { label: "Investment recommendations", prompt: "What are your investment recommendations for me?" },
  { label: "Create savings plan", prompt: "Help me create a monthly savings plan" },
  { label: "Market insights", prompt: "What are the current market trends?" },
];

export const AIChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [approvedTaskIds, setApprovedTaskIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const { isRecording, isTranscribing, startRecording, stopRecording } = useVoiceRecording((text) => {
    setInput(text);
  });

  useEffect(() => {
    // Cargar saludo inicial
    const loadInitialGreeting = async () => {
      try {
        let response;
        
        if (IS_LOCAL) {
          // Usar servidor Python local
          const res = await fetch(`${LOCAL_PYTHON_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [], isFirstMessage: true })
          });
          response = await res.json();
        } else {
          // Usar Supabase
          const { data, error } = await supabase.functions.invoke('ai-chat', {
            body: { messages: [], isFirstMessage: true }
          });
          if (error) throw error;
          response = data;
        }

        if (response?.response) {
          const greetingMessage: Message = {
            id: Date.now().toString(),
            role: "assistant",
            content: response.response,
            timestamp: new Date(),
            task: response.task,
          };
          setMessages([greetingMessage]);
        }
      } catch (error) {
        console.error('Error al cargar saludo:', error);
        const greetingMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: "¡Hola! Soy tu asistente de inversión. ¿Cómo puedo ayudarte hoy?",
          timestamp: new Date(),
        };
        setMessages([greetingMessage]);
      }
    };

    loadInitialGreeting();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const allMessages = [...messages, userMessage];
      let response;

      if (IS_LOCAL) {
        // Usar servidor Python local
        const res = await fetch(`${LOCAL_PYTHON_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            messages: allMessages,
            isFirstMessage: isFirstMessage
          })
        });
        response = await res.json();
      } else {
        // Usar Supabase
        const { data, error } = await supabase.functions.invoke('ai-chat', {
          body: { 
            messages: allMessages,
            isFirstMessage: isFirstMessage
          }
        });
        if (error) throw error;
        response = data;
      }

      if (response?.response) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response.response,
          timestamp: new Date(),
          task: response.task,
        };
        setMessages((prev) => [...prev, aiMessage]);
        setIsFirstMessage(false);
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      toast({
        title: "Error",
        description: "No se pudo conectar con el asistente de IA",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const aprobarTarea = async (task: any) => {
    try {
      // Guardar la tarea en Supabase
      const { error } = await supabase
        .from('pending_tasks')
        .insert({
          id: task.id,
          title: task.title,
          type: task.type,
          amount: task.amount,
          token: task.token,
          network: task.network,
          gas_estimate: task.gasEstimate,
        });

      if (error) throw error;
      
      console.log('Tarea aprobada y guardada en BD:', task);
      
      // Actualizar el balance del portafolio si es una transacción de compra/venta
      if (task.type === 'buy' || task.type === 'sell') {
        await actualizarBalancePortafolio(task);
      }
      
      // Marcar la tarea como aprobada para no mostrarla de nuevo
      setApprovedTaskIds(prev => new Set(prev).add(task.id));
      
      toast({
        title: "Tarea aprobada",
        description: "La tarea ha sido agregada a tus tareas pendientes",
      });
    } catch (error) {
      console.error('Error al aprobar tarea:', error);
      toast({
        title: "Error",
        description: "No se pudo aprobar la tarea",
        variant: "destructive",
      });
    }
  };

  const actualizarBalancePortafolio = async (task: any) => {
    try {
      const responsePortfolio = await fetch('/portfolio-data.json');
      const portfolioData = await responsePortfolio.json();
      
      // Calcular el valor de la transacción en USD
      const amount = parseFloat(task.amount);
      const gasEstimate = parseFloat(task.gasEstimate.replace('$', ''));
      
      // Precios aproximados de tokens (en producción usar API real)
      const tokenPrices: { [key: string]: number } = {
        'BTC': 30000,
        'ETH': 3200,
        'SOL': 100,
        'USDC': 1,
        'USDT': 1,
      };
      
      const tokenPrice = tokenPrices[task.token] || 1;
      const transactionValue = amount * tokenPrice;
      
      // Actualizar el valor total del portafolio
      if (task.type === 'buy') {
        portfolioData.totalValue += transactionValue + gasEstimate;
      } else if (task.type === 'sell') {
        portfolioData.totalValue -= transactionValue - gasEstimate;
      }
      
      console.log('Balance del portafolio actualizado:', portfolioData);
      
      toast({
        title: "Balance actualizado",
        description: `Nuevo balance: $${portfolioData.totalValue.toFixed(2)}`,
      });
      
      // En producción, aquí harías un POST/PUT para actualizar el JSON en el servidor
      // await fetch('/api/portfolio', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(portfolioData)
      // });
      
    } catch (error) {
      console.error('Error al actualizar balance del portafolio:', error);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    handleSend(action.prompt);
  };

  return (
    <Card className="flex flex-col h-[600px] shadow-[var(--shadow-ai)] animate-fade-in">
      <div className="p-4 border-b border-border bg-gradient-to-r from-accent/10 to-accent/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={aiAvatar} alt="AI Assistant" className="w-10 h-10 rounded-full" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-secondary rounded-full border-2 border-card" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              AI Investment Assistant
              <Brain className="h-4 w-4 text-accent" />
            </h3>
            <p className="text-xs text-muted-foreground">Always here to help</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 animate-slide-up ${
                message.role === "assistant" ? "justify-start" : "justify-end"
              }`}
            >
              {message.role === "assistant" && (
                <img src={aiAvatar} alt="AI" className="w-8 h-8 rounded-full flex-shrink-0" />
              )}
              <div className="max-w-[80%] space-y-2">
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.role === "assistant"
                      ? "bg-muted text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                {/* Tarjeta de tarea si existe y no ha sido aprobada */}
                {message.task && !approvedTaskIds.has(message.task.id) && (
                  <div className="bg-gradient-to-br from-accent/20 to-primary/10 border border-accent/30 rounded-xl p-4 shadow-lg animate-slide-up">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                          <span className="text-lg">
                            {message.task.type === 'buy' ? '💰' : 
                             message.task.type === 'sell' ? '💸' : 
                             message.task.type === 'transfer' ? '↔️' : '🔒'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">{message.task.title}</h4>
                          <p className="text-xs text-muted-foreground capitalize">{message.task.type}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="bg-card/50 rounded-lg p-2">
                        <p className="text-muted-foreground">Monto</p>
                        <p className="font-semibold">{message.task.amount} {message.task.token}</p>
                      </div>
                      <div className="bg-card/50 rounded-lg p-2">
                        <p className="text-muted-foreground">Red</p>
                        <p className="font-semibold">{message.task.network}</p>
                      </div>
                      <div className="bg-card/50 rounded-lg p-2 col-span-2">
                        <p className="text-muted-foreground">Gas estimado</p>
                        <p className="font-semibold text-accent">{message.task.gasEstimate}</p>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => aprobarTarea(message.task!)}
                      className="w-full"
                      size="sm"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Aprobar Tarea
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex gap-3 justify-start animate-slide-up">
              <img src={aiAvatar} alt="AI" className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="bg-muted rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border space-y-3">
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="quick"
              size="sm"
              onClick={() => handleQuickAction(action)}
              className="text-xs"
            >
              {action.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="flex-shrink-0"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTyping || isTranscribing}
          >
            {isRecording ? (
              <MicOff className="h-4 w-4 text-destructive animate-pulse" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isTyping && handleSend()}
            placeholder="Pregúntame sobre tus inversiones..."
            disabled={isTyping || isTranscribing}
            className="flex-1 text-[hsl(263,68%,20%)] placeholder:text-[hsl(263,68%,33%)]"
          />
          <Button 
            onClick={() => handleSend()} 
            size="icon" 
            variant="ai"
            disabled={!input.trim() || isTyping || isTranscribing}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
