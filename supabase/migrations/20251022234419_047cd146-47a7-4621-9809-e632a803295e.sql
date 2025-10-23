-- Secure RLS: restrict tables to authenticated users only

-- Contacts
alter table public.contacts enable row level security;
drop policy if exists "Allow all operations on contacts" on public.contacts;
create policy "contacts_crud_authenticated"
  on public.contacts
  for all
  to authenticated
  using (true)
  with check (true);

-- Movements
alter table public.movements enable row level security;
drop policy if exists "Allow all operations on movements" on public.movements;
create policy "movements_crud_authenticated"
  on public.movements
  for all
  to authenticated
  using (true)
  with check (true);

-- Saved Services
alter table public.saved_services enable row level security;
drop policy if exists "Allow all operations on saved_services" on public.saved_services;
create policy "saved_services_crud_authenticated"
  on public.saved_services
  for all
  to authenticated
  using (true)
  with check (true);

-- Pending Tasks: convert to authenticated-only CRUD
alter table public.pending_tasks enable row level security;
drop policy if exists "Anyone can delete pending tasks" on public.pending_tasks;
drop policy if exists "Anyone can insert pending tasks" on public.pending_tasks;
drop policy if exists "Anyone can view pending tasks" on public.pending_tasks;
create policy "pending_tasks_select" on public.pending_tasks for select to authenticated using (true);
create policy "pending_tasks_insert" on public.pending_tasks for insert to authenticated with check (true);
create policy "pending_tasks_update" on public.pending_tasks for update to authenticated using (true) with check (true);
create policy "pending_tasks_delete" on public.pending_tasks for delete to authenticated using (true);