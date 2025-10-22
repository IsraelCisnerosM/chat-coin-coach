import { CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Task {
  id: string;
  title: string;
  type: "buy" | "sell" | "transfer" | "stake";
  amount: string;
  token: string;
  network: string;
  gasEstimate: string;
}

export const PendingTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const { data, error } = await supabase
          .from('pending_tasks')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedTasks: Task[] = (data || []).map(task => ({
          id: task.id,
          title: task.title,
          type: task.type as Task["type"],
          amount: task.amount,
          token: task.token,
          network: task.network,
          gasEstimate: task.gas_estimate,
        }));

        setTasks(formattedTasks);
      } catch (err) {
        console.error('Error loading tasks:', err);
      }
    };

    loadTasks();
    
    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('pending_tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pending_tasks'
        },
        () => {
          loadTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApprove = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('pending_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast.success("Transaction approved and sent to blockchain");
    } catch (error) {
      console.error('Error approving task:', error);
      toast.error("Failed to approve transaction");
    }
  };

  const handleCancel = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('pending_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast.info("Task cancelled");
    } catch (error) {
      console.error('Error cancelling task:', error);
      toast.error("Failed to cancel task");
    }
  };
  const getTypeColor = (type: Task["type"]) => {
    switch (type) {
      case "buy": return "bg-secondary/10 text-secondary";
      case "sell": return "bg-destructive/10 text-destructive";
      case "transfer": return "bg-primary/10 text-primary";
      case "stake": return "bg-accent/10 text-accent";
    }
  };

  if (tasks.length === 0) {
    return (
      <Card className="p-6 shadow-[var(--shadow-card)] animate-fade-in">
        <div className="text-center space-y-2">
          <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
          <h3 className="font-semibold text-foreground">No Pending Tasks</h3>
          <p className="text-sm text-muted-foreground">
            All your AI-generated transactions have been processed
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all animate-fade-in">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Pending Tasks</h2>
          <Badge variant="secondary" className="text-xs">
            {tasks.length} waiting
          </Badge>
        </div>

        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-4 rounded-lg border border-border bg-card/50 space-y-3 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className={getTypeColor(task.type)}>
                      {task.type.toUpperCase()}
                    </Badge>
                    <span className="text-sm font-medium text-foreground">{task.title}</span>
                  </div>
                  
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>Amount: <span className="font-medium text-foreground">{task.amount} {task.token}</span></div>
                    <div>Network: <span className="font-medium text-foreground">{task.network}</span></div>
                    <div>Est. Gas: <span className="font-medium text-foreground">{task.gasEstimate}</span></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button
                  onClick={() => handleApprove(task.id)}
                  size="sm"
                  className="flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approve Transaction
                </Button>
                <Button
                  onClick={() => handleCancel(task.id)}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>

              <div className="text-xs text-muted-foreground pt-2 border-t border-border flex items-center gap-1">
                <span>This transaction will be signed with your private key and executed on {task.network}</span>
                <ExternalLink className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
