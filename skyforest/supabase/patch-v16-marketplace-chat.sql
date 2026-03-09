-- patch-v16: Marketplace chat between buyer and seller
-- After a listing is sold, buyer and seller can exchange messages.

create table if not exists public.marketplace_messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists idx_marketplace_messages_listing
  on public.marketplace_messages(listing_id, created_at);

alter table public.marketplace_messages enable row level security;

-- Only buyer and seller of a sold listing can read messages
create policy "Buyer and seller can read messages"
  on public.marketplace_messages for select
  using (
    exists (
      select 1 from public.marketplace_listings ml
      where ml.id = marketplace_messages.listing_id
        and ml.status = 'sold'
        and (ml.buyer_id = auth.uid() or ml.seller_id = auth.uid())
    )
  );

-- Only buyer and seller can insert messages for their listing
create policy "Buyer and seller can send messages"
  on public.marketplace_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.marketplace_listings ml
      where ml.id = marketplace_messages.listing_id
        and ml.status = 'sold'
        and (ml.buyer_id = auth.uid() or ml.seller_id = auth.uid())
    )
  );
