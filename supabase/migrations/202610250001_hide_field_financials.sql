-- Usta ve proje takipçisi ödeme/cari kayıtlarını okuyamaz veya değiştiremez.
-- Müşteri yalnız kendi ödeme kayıtlarını; yönetici tüm kayıtları görür.

drop policy if exists records_select_by_role on public.app_records;
create policy records_select_by_role on public.app_records for select to authenticated
using (
  organization_id = public.current_organization_id()
  and (
    public.current_app_role() = 'admin'
    or (public.current_app_role() in ('usta', 'proje') and entity_type <> 'payment')
    or (
      public.current_app_role() = 'musteri'
      and entity_type in ('project', 'payment')
      and data ->> 'customerId' = public.current_customer_id()
    )
    or (
      public.current_app_role() = 'musteri'
      and entity_type = 'customer'
      and entity_id = public.current_customer_id()
    )
  )
);

drop policy if exists records_insert_by_role on public.app_records;
create policy records_insert_by_role on public.app_records for insert to authenticated
with check (
  organization_id = public.current_organization_id()
  and (
    public.current_app_role() = 'admin'
    or (public.current_app_role() = 'proje' and entity_type in ('customer', 'survey', 'job', 'project'))
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
    or (public.current_app_role() = 'proje' and entity_type in ('customer', 'survey', 'job', 'project'))
    or (public.current_app_role() = 'usta' and entity_type in ('customer', 'survey', 'job', 'project'))
  )
);
