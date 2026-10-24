create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id text,
  name text not null,
  phone text not null default '',
  email text not null,
  role text not null check (role in ('admin', 'usta', 'proje', 'musteri')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_records (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('customer', 'survey', 'template', 'product', 'job', 'project', 'payment')),
  entity_id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, entity_type, entity_id)
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists app_records_touch_updated_at on public.app_records;
create trigger app_records_touch_updated_at before update on public.app_records for each row execute function public.touch_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_organization uuid;
  target_role text;
begin
  begin
    target_organization := nullif(new.raw_user_meta_data ->> 'organization_id', '')::uuid;
  exception when others then
    target_organization := null;
  end;

  if target_organization is null then
    select id into target_organization from public.organizations order by created_at limit 1;
  end if;
  if target_organization is null then
    insert into public.organizations(name) values ('Tesisat PRO') returning id into target_organization;
  end if;

  if not exists (select 1 from public.profiles where organization_id = target_organization) then
    target_role := 'admin';
  else
    target_role := coalesce(new.raw_user_meta_data ->> 'role', 'musteri');
  end if;
  if target_role not in ('admin', 'usta', 'proje', 'musteri') then target_role := 'musteri'; end if;

  insert into public.profiles(id, organization_id, customer_id, name, phone, email, role, active)
  values (
    new.id,
    target_organization,
    nullif(new.raw_user_meta_data ->> 'customer_id', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    new.email,
    target_role,
    true
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email on auth.users for each row execute function public.handle_new_auth_user();

create or replace function public.current_organization_id()
returns uuid language sql stable security definer set search_path = public
as $$ select organization_id from public.profiles where id = auth.uid() and active = true $$;

create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() and active = true $$;

create or replace function public.current_customer_id()
returns text language sql stable security definer set search_path = public
as $$ select customer_id from public.profiles where id = auth.uid() and active = true $$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.app_records enable row level security;

drop policy if exists organizations_select_own on public.organizations;
create policy organizations_select_own on public.organizations for select to authenticated
using (id = public.current_organization_id());

drop policy if exists profiles_select_organization on public.profiles;
create policy profiles_select_organization on public.profiles for select to authenticated
using (organization_id = public.current_organization_id() and (public.current_app_role() in ('admin', 'usta', 'proje') or id = auth.uid()));

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated
using (organization_id = public.current_organization_id() and public.current_app_role() = 'admin')
with check (organization_id = public.current_organization_id());

drop policy if exists records_select_by_role on public.app_records;
create policy records_select_by_role on public.app_records for select to authenticated
using (
  organization_id = public.current_organization_id()
  and (
    public.current_app_role() in ('admin', 'usta', 'proje')
    or (
      (
        public.current_app_role() = 'musteri'
        and entity_type in ('project', 'payment')
        and data ->> 'customerId' = public.current_customer_id()
      )
      or (public.current_app_role() = 'musteri' and entity_type = 'customer' and entity_id = public.current_customer_id())
    )
  )
);

drop policy if exists records_insert_by_role on public.app_records;
create policy records_insert_by_role on public.app_records for insert to authenticated
with check (
  organization_id = public.current_organization_id()
  and (
    public.current_app_role() = 'admin'
    or (public.current_app_role() = 'proje' and entity_type in ('customer', 'survey', 'job', 'project', 'payment'))
    or (public.current_app_role() = 'usta' and entity_type in ('customer', 'survey', 'job', 'project'))
  )
);

drop policy if exists records_update_by_role on public.app_records;
create policy records_update_by_role on public.app_records for update to authenticated
using (organization_id = public.current_organization_id())
with check (
  organization_id = public.current_organization_id()
  and (
    public.current_app_role() = 'admin'
    or (public.current_app_role() = 'proje' and entity_type in ('customer', 'survey', 'job', 'project', 'payment'))
    or (public.current_app_role() = 'usta' and entity_type in ('customer', 'survey', 'job', 'project'))
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 52428800, array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm'])
on conflict (id) do nothing;

drop policy if exists media_select_organization on storage.objects;
create policy media_select_organization on storage.objects for select to authenticated
using (bucket_id = 'media' and (storage.foldername(name))[1] = public.current_organization_id()::text);
drop policy if exists media_insert_organization on storage.objects;
create policy media_insert_organization on storage.objects for insert to authenticated
with check (bucket_id = 'media' and (storage.foldername(name))[1] = public.current_organization_id()::text and public.current_app_role() in ('admin','usta','proje'));
drop policy if exists media_update_organization on storage.objects;
create policy media_update_organization on storage.objects for update to authenticated
using (bucket_id = 'media' and (storage.foldername(name))[1] = public.current_organization_id()::text and public.current_app_role() in ('admin','usta','proje'));
drop policy if exists media_delete_organization on storage.objects;
create policy media_delete_organization on storage.objects for delete to authenticated
using (bucket_id = 'media' and (storage.foldername(name))[1] = public.current_organization_id()::text and public.current_app_role() in ('admin','usta','proje'));

do $$ begin
  alter publication supabase_realtime add table public.app_records;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;

