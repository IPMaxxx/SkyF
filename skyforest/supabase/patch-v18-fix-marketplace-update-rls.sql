-- patch-v18: Fix marketplace_listings UPDATE RLS policy
-- The original policy uses `status = 'active'` in USING without a WITH CHECK,
-- so PostgreSQL also checks the NEW row against `status = 'active'`, which
-- fails when changing status to 'cancelled' or 'sold'.

drop policy if exists "Seller can cancel own listings" on public.marketplace_listings;

create policy "Seller can cancel own listings"
  on public.marketplace_listings for update
  using (seller_id = auth.uid() and status = 'active')
  with check (true);
