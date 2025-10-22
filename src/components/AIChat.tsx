import { useState, useRef, useEffect } from "react";
import { Send, Mic, Brain } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import aiAvatar from "@/assets/ai-avatar.png";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your AI investment assistant. I can help you analyze your portfolio, get recommendations, and answer any questions about your investments. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text?: string) => {
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

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm analyzing your request. In a full implementation, this would connect to an AI backend to provide personalized investment advice based on your profile and market data.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
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
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
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
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <Mic className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask me anything about your investments..."
            className="flex-1"
          />
          <Button 
            onClick={() => handleSend()} 
            size="icon" 
            variant="ai"
            disabled={!input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
