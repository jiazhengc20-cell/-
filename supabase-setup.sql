-- 在 Supabase 的 SQL Editor 中执行一次。
-- 这会初始化愿望箱数据表、图片存储桶和登录用户权限。

create table if not exists public.wish_data (
  id uuid primary key default gen_random_uuid(),
  title text not null default '咕噜咕噜的愿望箱',
  data jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wish_data enable row level security;

drop policy if exists "authenticated users can read wish data" on public.wish_data;
drop policy if exists "authenticated users can insert wish data" on public.wish_data;
drop policy if exists "authenticated users can update wish data" on public.wish_data;

create policy "authenticated users can read wish data"
on public.wish_data for select to authenticated using (true);

create policy "authenticated users can insert wish data"
on public.wish_data for insert to authenticated with check (true);

create policy "authenticated users can update wish data"
on public.wish_data for update to authenticated using (true) with check (true);

insert into public.wish_data (title, data)
select '咕噜咕噜的愿望箱', '{"categories":[],"wishes":[]}'::jsonb
where not exists (
  select 1 from public.wish_data where title = '咕噜咕噜的愿望箱'
);

insert into storage.buckets (id, name, public)
values ('wish-images', 'wish-images', true)
on conflict (id) do update set public = true;

drop policy if exists "authenticated users can upload wish images" on storage.objects;
drop policy if exists "authenticated users can update own wish images" on storage.objects;
drop policy if exists "authenticated users can delete own wish images" on storage.objects;

create policy "authenticated users can upload wish images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'wish-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "authenticated users can update own wish images"
on storage.objects for update to authenticated
using (
  bucket_id = 'wish-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'wish-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "authenticated users can delete own wish images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'wish-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'wish_data'
  ) then
    alter publication supabase_realtime add table public.wish_data;
  end if;
end
$$;
