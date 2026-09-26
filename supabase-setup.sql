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

-- 私密幕后准备：只允许当前登录用户读取自己的记录。
create table if not exists public.private_wish_notes (
  wish_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  private_prep text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.private_wish_notes enable row level security;

drop policy if exists "users can read their own private wish notes" on public.private_wish_notes;
drop policy if exists "users can create their own private wish notes" on public.private_wish_notes;
drop policy if exists "users can update their own private wish notes" on public.private_wish_notes;
drop policy if exists "users can delete their own private wish notes" on public.private_wish_notes;

create policy "users can read their own private wish notes"
on public.private_wish_notes for select to authenticated
using ((select auth.uid()) = user_id);

create policy "users can create their own private wish notes"
on public.private_wish_notes for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "users can update their own private wish notes"
on public.private_wish_notes for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users can delete their own private wish notes"
on public.private_wish_notes for delete to authenticated
using ((select auth.uid()) = user_id);

-- 用户名：两个人都可以看到彼此的显示名，但只能修改自己的名字。
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "authenticated users can read profiles" on public.user_profiles;
drop policy if exists "users can create their own profile" on public.user_profiles;
drop policy if exists "users can update their own profile" on public.user_profiles;

create policy "authenticated users can read profiles"
on public.user_profiles for select to authenticated using (true);

create policy "users can create their own profile"
on public.user_profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "users can update their own profile"
on public.user_profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
