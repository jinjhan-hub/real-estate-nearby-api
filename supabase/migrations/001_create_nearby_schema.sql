-- V1.0 nearby_* schema migration draft.
-- Draft only: do not execute until manually reviewed and approved.
-- This file does not include seed data, API keys, or real customer addresses.

create extension if not exists "pgcrypto";

create or replace function set_nearby_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists nearby_store_settings (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  nearby_enabled boolean not null default false,
  daily_quota integer not null default 30,
  monthly_quota integer not null default 600,
  allowed_radii integer[] not null default array[500, 1000, 1500],
  default_radius integer not null default 1000,
  allowed_categories text[] not null default array[
    'park',
    'school',
    'shopping',
    'transport',
    'medical'
  ],
  google_daily_quota integer not null default 100,
  google_monthly_quota integer not null default 3000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nearby_store_settings_store_id_unique unique (store_id),
  constraint nearby_store_settings_default_radius_allowed
    check (default_radius = any(allowed_radii)),
  constraint nearby_store_settings_daily_quota_nonnegative
    check (daily_quota >= 0),
  constraint nearby_store_settings_monthly_quota_nonnegative
    check (monthly_quota >= 0),
  constraint nearby_store_settings_google_daily_quota_nonnegative
    check (google_daily_quota >= 0),
  constraint nearby_store_settings_google_monthly_quota_nonnegative
    check (google_monthly_quota >= 0)
);

create table if not exists nearby_usage_logs (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  request_id text not null,
  query_address_normalized text,
  query_address_masked text,
  lat numeric(10,7),
  lng numeric(10,7),
  radius integer not null default 1000,
  categories text[] not null default array[]::text[],
  result_source text not null default 'google',
  cache_hit boolean not null default false,
  cache_key text,
  facility_count_total integer not null default 0,
  status text not null default 'success',
  error_code text,
  created_at timestamptz not null default now(),
  constraint nearby_usage_logs_request_id_unique unique (request_id),
  constraint nearby_usage_logs_radius_positive
    check (radius > 0),
  constraint nearby_usage_logs_facility_count_nonnegative
    check (facility_count_total >= 0),
  constraint nearby_usage_logs_result_source_allowed
    check (result_source in ('cache', 'google', 'mixed', 'error')),
  constraint nearby_usage_logs_status_allowed
    check (
      status in (
        'success',
        'failed',
        'blocked_quota',
        'blocked_auth',
        'blocked_config'
      )
    )
);

create table if not exists nearby_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null,
  query_address_normalized text,
  lat numeric(10,7),
  lng numeric(10,7),
  radius integer not null default 1000,
  category text not null,
  google_place_type text,
  result_json jsonb not null default '[]'::jsonb,
  result_count integer not null default 0,
  source text not null default 'google_places',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nearby_cache_cache_key_unique unique (cache_key),
  constraint nearby_cache_radius_positive
    check (radius > 0),
  constraint nearby_cache_result_count_nonnegative
    check (result_count >= 0),
  constraint nearby_cache_category_allowed
    check (category in ('park', 'school', 'shopping', 'transport', 'medical'))
);

create table if not exists nearby_google_api_usage_logs (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  request_id text not null,
  google_api text not null,
  category text,
  radius integer,
  cache_key text,
  status text not null default 'success',
  cost_unit integer not null default 1,
  created_at timestamptz not null default now(),
  constraint nearby_google_api_usage_logs_cost_unit_nonnegative
    check (cost_unit >= 0),
  constraint nearby_google_api_usage_logs_google_api_allowed
    check (
      google_api in (
        'geocoding',
        'places_nearby_search',
        'places_text_search',
        'places_details'
      )
    ),
  constraint nearby_google_api_usage_logs_status_allowed
    check (
      status in (
        'success',
        'failed',
        'blocked_quota',
        'blocked_config',
        'timeout',
        'rate_limited',
        'skipped_cache'
      )
    )
);

create table if not exists nearby_generated_outputs (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  request_id text not null,
  output_type text not null,
  style_key text,
  content_json jsonb,
  content_text text,
  created_at timestamptz not null default now(),
  constraint nearby_generated_outputs_output_type_allowed
    check (
      output_type in (
        'facility_list',
        'fb_post',
        'image_card_copy',
        'short_video_script'
      )
    )
);

create index if not exists nearby_store_settings_store_id_idx
  on nearby_store_settings(store_id);

create index if not exists nearby_usage_logs_store_id_created_at_idx
  on nearby_usage_logs(store_id, created_at);

create index if not exists nearby_usage_logs_request_id_idx
  on nearby_usage_logs(request_id);

create index if not exists nearby_usage_logs_cache_key_idx
  on nearby_usage_logs(cache_key);

create index if not exists nearby_cache_cache_key_idx
  on nearby_cache(cache_key);

create index if not exists nearby_cache_query_radius_category_idx
  on nearby_cache(query_address_normalized, radius, category);

create index if not exists nearby_cache_expires_at_idx
  on nearby_cache(expires_at);

create index if not exists nearby_google_api_usage_logs_store_id_created_at_idx
  on nearby_google_api_usage_logs(store_id, created_at);

create index if not exists nearby_google_api_usage_logs_request_id_idx
  on nearby_google_api_usage_logs(request_id);

create index if not exists nearby_generated_outputs_store_id_created_at_idx
  on nearby_generated_outputs(store_id, created_at);

create index if not exists nearby_generated_outputs_request_id_idx
  on nearby_generated_outputs(request_id);

drop trigger if exists set_nearby_store_settings_updated_at
  on nearby_store_settings;

create trigger set_nearby_store_settings_updated_at
before update on nearby_store_settings
for each row
execute function set_nearby_updated_at();

drop trigger if exists set_nearby_cache_updated_at
  on nearby_cache;

create trigger set_nearby_cache_updated_at
before update on nearby_cache
for each row
execute function set_nearby_updated_at();

-- V1.0 view drafts. These are migration draft definitions only and were not executed.

create or replace view nearby_store_usage_summary as
with usage_agg as (
  select
    store_id,
    count(*) filter (
      where created_at >= date_trunc('day', now())
    ) as today_usage_count,
    count(*) filter (
      where created_at >= date_trunc('month', now())
    ) as month_usage_count,
    count(*) as total_usage_count,
    count(*) filter (
      where cache_hit = true
        and created_at >= date_trunc('day', now())
    ) as today_cache_count,
    count(*) filter (
      where cache_hit = true
        and created_at >= date_trunc('month', now())
    ) as month_cache_count,
    count(*) filter (
      where cache_hit = true
    ) as total_cache_count,
    max(created_at) as last_used_at
  from nearby_usage_logs
  group by store_id
),
google_agg as (
  select
    store_id,
    count(*) filter (
      where status = 'success'
        and created_at >= date_trunc('day', now())
    ) as today_google_api_count,
    count(*) filter (
      where status = 'success'
        and created_at >= date_trunc('month', now())
    ) as month_google_api_count,
    count(*) filter (
      where status = 'success'
    ) as total_google_api_count
  from nearby_google_api_usage_logs
  group by store_id
)
select
  s.store_id,
  s.store_name,
  coalesce(ua.today_usage_count, 0) as today_usage_count,
  coalesce(ua.month_usage_count, 0) as month_usage_count,
  coalesce(ua.total_usage_count, 0) as total_usage_count,
  coalesce(ua.today_cache_count, 0) as today_cache_count,
  coalesce(ua.month_cache_count, 0) as month_cache_count,
  coalesce(ua.total_cache_count, 0) as total_cache_count,
  coalesce(ga.today_google_api_count, 0) as today_google_api_count,
  coalesce(ga.month_google_api_count, 0) as month_google_api_count,
  coalesce(ga.total_google_api_count, 0) as total_google_api_count,
  ua.last_used_at
from stores s
left join usage_agg ua
  on ua.store_id = s.store_id
left join google_agg ga
  on ga.store_id = s.store_id
;

create or replace view nearby_store_quota_status as
with usage_agg as (
  select
    store_id,
    count(*) filter (
      where created_at >= date_trunc('day', now())
    ) as today_usage_count,
    count(*) filter (
      where created_at >= date_trunc('month', now())
    ) as month_usage_count
  from nearby_usage_logs
  group by store_id
),
google_agg as (
  select
    store_id,
    count(*) filter (
      where status = 'success'
        and created_at >= date_trunc('day', now())
    ) as today_google_api_count,
    count(*) filter (
      where status = 'success'
        and created_at >= date_trunc('month', now())
    ) as month_google_api_count
  from nearby_google_api_usage_logs
  group by store_id
)
select
  s.store_id,
  s.store_name,
  coalesce(nss.nearby_enabled, false) as nearby_enabled,
  coalesce(nss.daily_quota, 0) as daily_quota,
  coalesce(nss.monthly_quota, 0) as monthly_quota,
  coalesce(ua.today_usage_count, 0) as today_usage_count,
  coalesce(ua.month_usage_count, 0) as month_usage_count,
  greatest(
    coalesce(nss.daily_quota, 0)
      - coalesce(ua.today_usage_count, 0),
    0
  ) as today_remaining,
  greatest(
    coalesce(nss.monthly_quota, 0)
      - coalesce(ua.month_usage_count, 0),
    0
  ) as month_remaining,
  coalesce(nss.google_daily_quota, 0) as google_daily_quota,
  coalesce(nss.google_monthly_quota, 0) as google_monthly_quota,
  coalesce(ga.today_google_api_count, 0) as today_google_api_count,
  coalesce(ga.month_google_api_count, 0) as month_google_api_count,
  greatest(
    coalesce(nss.google_daily_quota, 0)
      - coalesce(ga.today_google_api_count, 0),
    0
  ) as today_google_remaining,
  greatest(
    coalesce(nss.google_monthly_quota, 0)
      - coalesce(ga.month_google_api_count, 0),
    0
  ) as month_google_remaining
from stores s
left join nearby_store_settings nss
  on nss.store_id = s.store_id
left join usage_agg ua
  on ua.store_id = s.store_id
left join google_agg ga
  on ga.store_id = s.store_id
;

create or replace view nearby_system_usage_summary as
with usage_agg as (
  select
    count(*) filter (
      where created_at >= date_trunc('day', now())
    ) as today_total_queries,
    count(*) filter (
      where created_at >= date_trunc('month', now())
    ) as month_total_queries,
    count(*) filter (
      where cache_hit = true
        and created_at >= date_trunc('day', now())
    ) as today_cache_hits,
    count(*) filter (
      where cache_hit = true
        and created_at >= date_trunc('month', now())
    ) as month_cache_hits
  from nearby_usage_logs
),
google_agg as (
  select
    count(*) filter (
      where status = 'success'
        and created_at >= date_trunc('day', now())
    ) as today_google_api_calls,
    count(*) filter (
      where status = 'success'
        and created_at >= date_trunc('month', now())
    ) as month_google_api_calls
  from nearby_google_api_usage_logs
)
select
  coalesce(ua.today_total_queries, 0) as today_total_queries,
  coalesce(ua.month_total_queries, 0) as month_total_queries,
  coalesce(ga.today_google_api_calls, 0) as today_google_api_calls,
  coalesce(ga.month_google_api_calls, 0) as month_google_api_calls,
  coalesce(ua.today_cache_hits, 0) as today_cache_hits,
  coalesce(ua.month_cache_hits, 0) as month_cache_hits,
  null::integer as system_google_daily_quota,
  null::integer as system_google_monthly_quota,
  null::integer as system_google_daily_remaining,
  null::integer as system_google_monthly_remaining
from usage_agg ua
cross join google_agg ga;

-- RLS is intentionally not enabled in V1.0.
-- RLS should be planned after the API permission model is confirmed.
-- No seed data is included.
-- No real API keys or real addresses are included.
