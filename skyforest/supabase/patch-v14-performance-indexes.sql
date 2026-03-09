-- patch-v14: Add missing indexes for performance
--
-- auto_compares is queried by user_id on every visit to the compare page,
-- but the only existing index covers (enabled, run_time) for the cron job.
-- Without a user_id index the query does a sequential scan.

create index if not exists idx_auto_compares_user
  on public.auto_compares(user_id);

create index if not exists idx_auto_compares_location
  on public.auto_compares(location_id);
