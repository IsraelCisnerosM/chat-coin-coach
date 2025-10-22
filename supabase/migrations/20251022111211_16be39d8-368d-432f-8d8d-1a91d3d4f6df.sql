-- Create pending_tasks table to store approved tasks
CREATE TABLE IF NOT EXISTS public.pending_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  amount TEXT NOT NULL,
  token TEXT NOT NULL,
  network TEXT NOT NULL,
  gas_estimate TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pending_tasks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read tasks (for demo purposes)
CREATE POLICY "Anyone can view pending tasks"
  ON public.pending_tasks
  FOR SELECT
  USING (true);

-- Create policy to allow anyone to insert tasks (for demo purposes)
CREATE POLICY "Anyone can insert pending tasks"
  ON public.pending_tasks
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow anyone to delete tasks (for demo purposes)
CREATE POLICY "Anyone can delete pending tasks"
  ON public.pending_tasks
  FOR DELETE
  USING (true);