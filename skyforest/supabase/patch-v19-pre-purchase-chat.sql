-- patch-v19: Pre-purchase chat — allow messaging on active listings
-- Adds recipient_id to marketplace_messages so conversations between
-- seller and each potential buyer are separated.

-- 1) Add recipient_id column
alter table public.marketplace_messages
  add column if not exists recipient_id uuid references auth.users(id) on delete cascade;

-- 2) Backfill recipient_id for existing messages (sold listings only)
update public.marketplace_messages mm
set recipient_id = case
  when mm.sender_id = ml.seller_id then ml.buyer_id
  else ml.seller_id
end
from public.marketplace_listings ml
where mm.listing_id = ml.id
  and mm.recipient_id is null;

-- 3) Drop old RLS policies
drop policy if exists "Buyer and seller can read messages" on public.marketplace_messages;
drop policy if exists "Buyer and seller can send messages" on public.marketplace_messages;

-- 4) New SELECT policy: user can read messages where they are sender or recipient
create policy "Users can read own messages"
  on public.marketplace_messages for select
  using (
    auth.uid() = sender_id
    or auth.uid() = recipient_id
  );

-- 5) New INSERT policy: authenticated user can send messages on active or sold listings
create policy "Users can send messages on active or sold listings"
  on public.marketplace_messages for insert
  with check (
    sender_id = auth.uid()
    and recipient_id is not null
    and sender_id != recipient_id
    and exists (
      select 1 from public.marketplace_listings ml
      where ml.id = marketplace_messages.listing_id
        and ml.status in ('active', 'sold')
        and (
          -- on active listings: sender must be seller or recipient must be seller
          (ml.status = 'active' and (ml.seller_id = auth.uid() or ml.seller_id = recipient_id))
          or
          -- on sold listings: sender must be buyer or seller
          (ml.status = 'sold' and (ml.buyer_id = auth.uid() or ml.seller_id = auth.uid()))
        )
    )
  );
