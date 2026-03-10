-- patch-v21: Track read status for marketplace chat conversations

create table if not exists public.marketplace_chat_reads (
  user_id    uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  partner_id uuid not null references auth.users(id) on delete cascade,
  read_at    timestamptz not null default now(),
  primary key (user_id, listing_id, partner_id)
);

alter table public.marketplace_chat_reads enable row level security;

create policy "Users can manage own reads"
  on public.marketplace_chat_reads
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
