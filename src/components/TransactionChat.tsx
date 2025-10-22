import { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, Check, X, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import aiAvatar from "@/assets/ai-avatar.png";

const IS_LOCAL = import.meta.env.DEV && import.meta.env.VITE_USE_LOCAL_PYTHON === 'true';
const LOCAL_PYTHON_URL = import.meta.env.VITE_LOCAL_PYTHON_URL || 'http://localhost:8000';

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  action?: {
    type: 'transfer' | 'contact_register' | 'service_payment';
    data: any;
    id: string;
  };
}

export const TransactionChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [approvedActionIds, setApprovedActionIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const { isRecording, isTranscribing, startRecording, stopRecording } = useVoiceRecording((text) => {
    setInput(text);
  });

  useEffect(() => {
    const loadInitialGreeting = async () => {
      try {
        let response;
        
        if (IS_LOCAL) {
          const res = await fetch(`${LOCAL_PYTHON_URL}/transaction-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [], isFirstMessage: true })
          });
          response = await res.json();
        } else {
          const { data, error } = await supabase.functions.invoke('transaction-chat', {
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
            action: response.action,
          };
          setMessages([greetingMessage]);
        }
      } catch (error) {
        console.error('Error al cargar saludo:', error);
        const greetingMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: "¡Hola! Soy tu asistente de transacciones. Puedo ayudarte a enviar dinero, registrar contactos y pagar servicios. ¿Qué necesitas hacer hoy?",
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
        const res = await fetch(`${LOCAL_PYTHON_URL}/transaction-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: allMessages })
        });
        response = await res.json();
      } else {
        const { data, error } = await supabase.functions.invoke('transaction-chat', {
          body: { messages: allMessages }
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
          action: response.action,
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      toast({
        title: "Error",
        description: "No se pudo conectar con el asistente",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const approveAction = async (action: any) => {
    try {
      if (action.type === 'transfer') {
        // Guardar transferencia en movimientos
        const { error } = await supabase
          .from('movements')
          .insert({
            type: 'transfer',
            amount: action.data.amount,
            token: action.data.token,
            network: action.data.network,
            recipient_name: action.data.recipient_name,
            recipient_email: action.data.recipient_email,
            description: action.data.description,
            status: 'completed'
          });

        if (error) throw error;
        
        toast({
          title: "Transferencia aprobada",
          description: "La transferencia se ha registrado exitosamente",
        });
      } else if (action.type === 'contact_register') {
        // Registrar contacto
        const { error } = await supabase
          .from('contacts')
          .insert({
            name: action.data.name,
            email: action.data.email,
            phone: action.data.phone,
            wallet_address: action.data.wallet_address
          });

        if (error) throw error;
        
        toast({
          title: "Contacto registrado",
          description: "El contacto se ha agregado exitosamente",
        });
      } else if (action.type === 'service_payment') {
        // Guardar pago de servicio
        const { error } = await supabase
          .from('movements')
          .insert({
            type: 'service_payment',
            amount: action.data.amount,
            token: action.data.token,
            network: action.data.network,
            service_name: action.data.service_name,
            description: action.data.description,
            status: 'completed'
          });

        if (error) throw error;
        
        toast({
          title: "Pago aprobado",
          description: "El pago del servicio se ha registrado",
        });
      }

      setApprovedActionIds(prev => new Set(prev).add(action.id));
    } catch (error) {
      console.error('Error al aprobar acción:', error);
      toast({
        title: "Error",
        description: "No se pudo completar la acción",
        variant: "destructive",
      });
    }
  };

  const rejectAction = (actionId: string) => {
    setApprovedActionIds(prev => new Set(prev).add(actionId));
    toast({
      title: "Acción rechazada",
      description: "La acción ha sido cancelada",
    });
  };

  return (
    <Card className="flex flex-col h-[600px] shadow-lg bg-[hsl(291,47%,88%)] border-0">
      <div className="p-4 border-b border-[hsl(291,64%,62%)]/20">
        <div className="flex items-center gap-3">
          <div className="rounded-full p-2 bg-[hsl(259,59%,46%)]">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-[hsl(263,68%,20%)]">Asistente de Transacciones</h3>
            <p className="text-xs text-[hsl(263,68%,33%)]">Transferencias y pagos simplificados</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 bg-white rounded-lg" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 animate-slide-up ${
                message.role === "assistant" ? "justify-start" : "justify-end"
              }`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-[hsl(259,59%,46%)] flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="h-4 w-4 text-white" />
                </div>
              )}
              <div className="max-w-[80%] space-y-2">
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.role === "assistant"
                      ? "bg-gray-100 text-gray-900"
                      : "bg-[hsl(259,59%,46%)] text-white"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                {message.action && !approvedActionIds.has(message.action.id) && (
                  <div className="bg-gradient-to-br from-accent/20 to-primary/10 border border-accent/30 rounded-xl p-4 shadow-lg">
                    <h4 className="font-semibold mb-3 text-sm">
                      {message.action.type === 'transfer' ? '💸 Transferencia' :
                       message.action.type === 'contact_register' ? '👤 Registro de Contacto' :
                       '💳 Pago de Servicio'}
                    </h4>
                    
                    <div className="grid gap-2 text-xs mb-3">
                      {Object.entries(message.action.data).map(([key, value]) => (
                        <div key={key} className="bg-card/50 rounded-lg p-2">
                          <p className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                          <p className="font-semibold">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => approveAction(message.action!)}
                        className="flex-1"
                        size="sm"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Aprobar
                      </Button>
                      <Button 
                        onClick={() => rejectAction(message.action!.id)}
                        variant="outline"
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-[hsl(259,59%,46%)] flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-[hsl(259,59%,46%)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-[hsl(259,59%,46%)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-[hsl(259,59%,46%)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-[hsl(291,64%,62%)]/20">
        <div className="flex gap-2">
          <Button 
            size="icon" 
            variant="ghost"
            className="shrink-0"
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
            placeholder="Ej: Envía 50 USDT a Juan..."
            className="flex-1 bg-white border-[hsl(291,64%,62%)]"
            disabled={isTyping || isTranscribing}
          />
          <Button 
            onClick={() => handleSend()} 
            size="icon" 
            className="bg-[hsl(259,59%,46%)] hover:bg-[hsl(263,68%,33%)] text-white"
            disabled={!input.trim() || isTyping || isTranscribing}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
