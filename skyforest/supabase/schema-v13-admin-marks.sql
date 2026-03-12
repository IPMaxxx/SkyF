-- v13: Admin marks — admins can tag any location/best_day with a status & note

create table public.admin_marks (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete cascade not null,
  target_type text not null check (target_type in ('location', 'best_day', 'deleted_location', 'deleted_best_day')),
  target_id uuid not null,
  status text not null default 'interesting' check (status in ('interesting', 'priority', 'secondary', 'reviewed', 'suspicious')),
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (admin_id, target_type, target_id)
);

alter table public.admin_marks enable row level security;

create policy "Admins can manage admin_marks"
  on public.admin_marks for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.account_type = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.account_type = 'admin'
    )
  );

create index idx_admin_marks_target on public.admin_marks(target_type, target_id);
create index idx_admin_marks_status on public.admin_marks(status);
create index idx_admin_marks_admin on public.admin_marks(admin_id);
