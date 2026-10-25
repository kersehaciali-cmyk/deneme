-- Saha rolleri (usta / proje takipçisi) finansal alanları app_records
-- tablosundan doğrudan okuyamaz. Okuma, hassas alanları sunucuda maskeleyen
-- RPC üzerinden yapılır; yazma da yalnız izin verilen alanları kabul eden RPC'ye
-- yönlendirilir.

create or replace function public.redact_field_record_data(p_entity_type text, p_data jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  result jsonb := coalesce(p_data, '{}'::jsonb);
  safe_lines jsonb;
begin
  if p_entity_type = 'survey' then
    select coalesce(jsonb_agg(items.value - 'unitCost' - 'unitSale'), '[]'::jsonb)
      into safe_lines
      from jsonb_array_elements(
        case when jsonb_typeof(result -> 'lines') = 'array' then result -> 'lines' else '[]'::jsonb end
      ) as items(value);

    result := jsonb_set(result - 'auditLog' - 'total', '{lines}', safe_lines, true);
    result := result || jsonb_build_object('total', 0, 'auditLog', '[]'::jsonb);
  elsif p_entity_type = 'product' then
    result := (result - 'cost' - 'sale' - 'priceHistory')
      || jsonb_build_object('cost', 0, 'sale', 0, 'priceHistory', '[]'::jsonb);
  elsif p_entity_type = 'customer' then
    result := (result - 'balance') || jsonb_build_object('balance', 0);
  end if;

  return result;
end;
$$;

revoke all on function public.redact_field_record_data(text, jsonb) from public, anon, authenticated;

create or replace function public.summarize_survey_materials(p_items jsonb)
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(
    string_agg(
      coalesce(item ->> 'label', 'İsimsiz malzeme')
        || ' × ' || coalesce(item ->> 'quantity', '0')
        || case when coalesce(item ->> 'unit', '') = '' then '' else ' ' || (item ->> 'unit') end
        || case when item -> 'prepared' = 'true'::jsonb then ' (hazır)' else ' (bekliyor)' end,
      ' | ' order by coalesce(item ->> 'label', ''), coalesce(item ->> 'id', '')
    ),
    '—'
  )
  from jsonb_array_elements(
    case when jsonb_typeof(p_items) = 'array' then p_items else '[]'::jsonb end
  ) as items(item);
$$;

create or replace function public.summarize_survey_attachments(p_items jsonb)
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(
    string_agg(
      coalesce(item ->> 'name', 'İsimsiz dosya')
        || case
          when coalesce(item ->> 'description', '') = '' then ''
          else ' — ' || (item ->> 'description')
        end,
      ' | ' order by coalesce(item ->> 'name', ''), coalesce(item ->> 'id', '')
    ),
    '—'
  )
  from jsonb_array_elements(
    case when jsonb_typeof(p_items) = 'array' then p_items else '[]'::jsonb end
  ) as items(item);
$$;

revoke all on function public.summarize_survey_materials(jsonb) from public, anon, authenticated;
revoke all on function public.summarize_survey_attachments(jsonb) from public, anon, authenticated;

create or replace function public.sanitize_field_project_attachments(p_new_items jsonb, p_old_items jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  result jsonb := '[]'::jsonb;
  new_item jsonb;
  old_item jsonb;
begin
  for new_item in
    select value
    from jsonb_array_elements(
      case when jsonb_typeof(p_new_items) = 'array' then p_new_items else '[]'::jsonb end
    )
  loop
    select item into old_item
    from jsonb_array_elements(
      case when jsonb_typeof(p_old_items) = 'array' then p_old_items else '[]'::jsonb end
    ) as old_items(item)
    where item ->> 'id' = new_item ->> 'id'
    limit 1;

    new_item := (new_item - 'approved' - 'adminComment')
      || jsonb_build_object(
        'approved', coalesce(old_item -> 'approved', 'false'::jsonb),
        'adminComment', coalesce(old_item -> 'adminComment', '""'::jsonb)
      );
    result := result || jsonb_build_array(new_item);
    old_item := null;
  end loop;

  return result;
end;
$$;

revoke all on function public.sanitize_field_project_attachments(jsonb, jsonb) from public, anon, authenticated;

create or replace function public.get_visible_app_records()
returns table(entity_type text, entity_id text, data jsonb)
language sql
stable
security definer
set search_path = public
as $$
  with viewer as (
    select
      public.current_organization_id() as organization_id,
      public.current_app_role() as app_role,
      public.current_customer_id() as customer_id
  )
  select
    record.entity_type,
    record.entity_id,
    case
      when viewer.app_role in ('usta', 'proje')
        then public.redact_field_record_data(record.entity_type, record.data)
      else record.data
    end as data
  from public.app_records as record
  cross join viewer
  where record.organization_id = viewer.organization_id
    and (
      viewer.app_role = 'admin'
      or (viewer.app_role in ('usta', 'proje') and record.entity_type <> 'payment')
      or (
        viewer.app_role = 'musteri'
        and record.entity_type in ('project', 'payment')
        and record.data ->> 'customerId' = viewer.customer_id
      )
      or (
        viewer.app_role = 'musteri'
        and record.entity_type = 'customer'
        and record.entity_id = viewer.customer_id
      )
    );
$$;

revoke all on function public.get_visible_app_records() from public, anon;
grant execute on function public.get_visible_app_records() to authenticated;

-- Finansal alanları sunucuda hesaplayarak yeni bir saha keşfi hazırlar.
-- Güncel ürün fiyatları yalnız bu fonksiyonun güvenli yürütme bağlamında okunur.
create or replace function public.price_field_survey(
  p_organization_id uuid,
  p_data jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb := coalesce(p_data, '{}'::jsonb) - 'auditLog' - 'total';
  priced_lines jsonb := '[]'::jsonb;
  line_item jsonb;
  product_data jsonb;
  quantity_value numeric;
  cost_value numeric;
  sale_value numeric;
  total_value numeric := 0;
begin
  for line_item in
    select value
    from jsonb_array_elements(
      case when jsonb_typeof(result -> 'lines') = 'array' then result -> 'lines' else '[]'::jsonb end
    )
  loop
    quantity_value := case
      when jsonb_typeof(line_item -> 'quantity') = 'number'
        then greatest((line_item ->> 'quantity')::numeric, 0)
      else 0
    end;

    select record.data into product_data
    from public.app_records as record
    where record.organization_id = p_organization_id
      and record.entity_type = 'product'
      and record.entity_id = line_item ->> 'productId';

    if product_data is null then
      raise exception 'Keşif satırındaki ürün bulunamadı.' using errcode = '22023';
    end if;

    cost_value := case
      when jsonb_typeof(product_data -> 'cost') = 'number' then (product_data ->> 'cost')::numeric
      else 0
    end;
    sale_value := case
      when jsonb_typeof(product_data -> 'sale') = 'number' then (product_data ->> 'sale')::numeric
      else 0
    end;

    line_item := (line_item - 'unitCost' - 'unitSale')
      || jsonb_build_object(
        'quantity', quantity_value,
        'unitCost', cost_value,
        'unitSale', sale_value
      );
    priced_lines := priced_lines || jsonb_build_array(line_item);
    total_value := total_value + sale_value * quantity_value;
  end loop;

  return jsonb_set(result, '{lines}', priced_lines, true)
    || jsonb_build_object('total', total_value, 'auditLog', '[]'::jsonb);
end;
$$;

revoke all on function public.price_field_survey(uuid, jsonb) from public, anon, authenticated;

-- Saha kullanıcılarının kayıt yazma kapısı. Finansal/audit alanları istemciden
-- kabul edilmez; var olan keşif fiyatları ve geçmişi korunur.
create or replace function public.save_field_app_record(
  p_entity_type text,
  p_entity_id text,
  p_data jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_organization uuid := public.current_organization_id();
  viewer_role text := public.current_app_role();
  viewer_name text;
  old_data jsonb;
  next_data jsonb;
  changes jsonb := '[]'::jsonb;
  audit_entry jsonb;
  immutable_key text;
  old_stage integer;
  requested_stage integer;
  last_stage integer;
begin
  if viewer_organization is null or viewer_role not in ('usta', 'proje') then
    raise exception 'Bu işlem yalnız yetkili saha kullanıcıları içindir.' using errcode = '42501';
  end if;
  if p_entity_type not in ('customer', 'survey', 'job', 'project') then
    raise exception 'Bu kayıt türü saha kullanıcıları tarafından değiştirilemez.' using errcode = '42501';
  end if;
  if p_entity_id is null or btrim(p_entity_id) = ''
    or coalesce(p_data ->> 'id', '') <> p_entity_id then
    raise exception 'Kayıt kimliği geçersiz.' using errcode = '22023';
  end if;

  select record.data into old_data
  from public.app_records as record
  where record.organization_id = viewer_organization
    and record.entity_type = p_entity_type
    and record.entity_id = p_entity_id
  for update;

  if p_entity_type = 'customer' then
    next_data := (coalesce(p_data, '{}'::jsonb) - 'balance')
      || jsonb_build_object(
        'balance', coalesce(old_data -> 'balance', '0'::jsonb)
      );

  elsif p_entity_type = 'survey' then
    if old_data is null then
      if coalesce(p_data ->> 'type', '') not in ('Doğalgaz', 'Isı Pompası', 'Sıhhi Tesisat', 'Klima') then
        raise exception 'Keşif türü geçersiz.' using errcode = '22023';
      end if;
      if coalesce(p_data ->> 'status', '') not in (
        'Taslak', 'Fiyatlandırıldı', 'Teklif Gönderildi', 'Kabul Edildi',
        'Onaylandı', 'Siparişe Alındı', 'Reddedildi'
      ) then
        raise exception 'Yeni keşif durumu geçersiz.' using errcode = '22023';
      end if;
      next_data := public.price_field_survey(viewer_organization, p_data);
    else
      -- Saha ekranlarının gerektirdiği operasyonel alanlar güncellenebilir;
      -- müşteri, tür, teknik seçim, satır fiyatları, toplam ve eski audit korunur.
      next_data := old_data;
      if viewer_role = 'proje' and p_data ? 'status' then
        if coalesce(p_data ->> 'status', '') not in (
          'Taslak', 'Fiyatlandırıldı', 'Teklif Gönderildi', 'Kabul Edildi',
          'Onaylandı', 'Siparişe Alındı', 'Projeye Dönüştü', 'Reddedildi'
        ) then
          raise exception 'Keşif durumu geçersiz.' using errcode = '22023';
        end if;
        next_data := jsonb_set(next_data, '{status}', p_data -> 'status', true);
      end if;
      foreach immutable_key in array array[
        'siteAddress', 'siteContactName', 'siteContactPhone',
        'latitude', 'longitude', 'attachments', 'materials'
      ]
      loop
        if p_data ? immutable_key then
          next_data := jsonb_set(next_data, array[immutable_key], p_data -> immutable_key, true);
        end if;
      end loop;

      if old_data ->> 'status' is distinct from next_data ->> 'status' then
        changes := changes || jsonb_build_array(jsonb_build_object(
          'field', 'Durum',
          'before', coalesce(old_data ->> 'status', '—'),
          'after', coalesce(next_data ->> 'status', '—'),
          'kind', 'selection'
        ));
      end if;
      if old_data ->> 'siteAddress' is distinct from next_data ->> 'siteAddress' then
        changes := changes || jsonb_build_array(jsonb_build_object(
          'field', 'Uygulama adresi',
          'before', coalesce(old_data ->> 'siteAddress', '—'),
          'after', coalesce(next_data ->> 'siteAddress', '—'),
          'kind', 'field'
        ));
      end if;
      if old_data ->> 'siteContactName' is distinct from next_data ->> 'siteContactName' then
        changes := changes || jsonb_build_array(jsonb_build_object(
          'field', 'İletişim kişisi',
          'before', coalesce(old_data ->> 'siteContactName', '—'),
          'after', coalesce(next_data ->> 'siteContactName', '—'),
          'kind', 'field'
        ));
      end if;
      if old_data ->> 'siteContactPhone' is distinct from next_data ->> 'siteContactPhone' then
        changes := changes || jsonb_build_array(jsonb_build_object(
          'field', 'İletişim telefonu',
          'before', coalesce(old_data ->> 'siteContactPhone', '—'),
          'after', coalesce(next_data ->> 'siteContactPhone', '—'),
          'kind', 'field'
        ));
      end if;
      if old_data ->> 'latitude' is distinct from next_data ->> 'latitude' then
        changes := changes || jsonb_build_array(jsonb_build_object(
          'field', 'Enlem',
          'before', coalesce(old_data ->> 'latitude', '—'),
          'after', coalesce(next_data ->> 'latitude', '—'),
          'kind', 'field'
        ));
      end if;
      if old_data ->> 'longitude' is distinct from next_data ->> 'longitude' then
        changes := changes || jsonb_build_array(jsonb_build_object(
          'field', 'Boylam',
          'before', coalesce(old_data ->> 'longitude', '—'),
          'after', coalesce(next_data ->> 'longitude', '—'),
          'kind', 'field'
        ));
      end if;
      if old_data -> 'materials' is distinct from next_data -> 'materials' then
        changes := changes || jsonb_build_array(jsonb_build_object(
          'field', 'Malzeme listesi',
          'before', public.summarize_survey_materials(old_data -> 'materials'),
          'after', public.summarize_survey_materials(next_data -> 'materials'),
          'kind', 'selection'
        ));
      end if;
      if old_data -> 'attachments' is distinct from next_data -> 'attachments' then
        changes := changes || jsonb_build_array(jsonb_build_object(
          'field', 'Keşif fotoğrafları',
          'before', public.summarize_survey_attachments(old_data -> 'attachments'),
          'after', public.summarize_survey_attachments(next_data -> 'attachments'),
          'kind', 'selection'
        ));
      end if;

      if jsonb_array_length(changes) > 0 then
        select profile.name into viewer_name from public.profiles as profile where profile.id = auth.uid();
        audit_entry := jsonb_build_object(
          'id', 'survey-audit-' || gen_random_uuid()::text,
          'createdAt', to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'actorId', auth.uid()::text,
          'actorName', coalesce(viewer_name, 'Bilinmeyen kullanıcı'),
          'changes', changes
        );
        next_data := jsonb_set(
          next_data,
          '{auditLog}',
          (case when jsonb_typeof(old_data -> 'auditLog') = 'array' then old_data -> 'auditLog' else '[]'::jsonb end)
            || jsonb_build_array(audit_entry),
          true
        );
      end if;
    end if;

  elsif p_entity_type = 'job' then
    if old_data is null then
      if viewer_role <> 'proje' then
        raise exception 'Usta yeni iş kaydı oluşturamaz.' using errcode = '42501';
      end if;
      next_data := p_data;
    else
      if viewer_role = 'usta'
        and coalesce(old_data ->> 'assignedMasterId', '') <> auth.uid()::text then
        raise exception 'Bu iş size atanmamış.' using errcode = '42501';
      end if;
      next_data := p_data;
      foreach immutable_key in array array['id', 'customerId', 'projectId', 'assignedMasterId', 'assignee', 'createdAt']
      loop
        if old_data ? immutable_key then
          next_data := jsonb_set(next_data, array[immutable_key], old_data -> immutable_key, true);
        end if;
      end loop;
    end if;

  elsif p_entity_type = 'project' then
    if old_data is null then
      if viewer_role <> 'proje' then
        raise exception 'Usta yeni proje kaydı oluşturamaz.' using errcode = '42501';
      end if;
      next_data := jsonb_set(p_data - 'adminApproved', '{adminApproved}', 'false'::jsonb, true);
      next_data := jsonb_set(next_data, '{currentStage}', '0'::jsonb, true);
      next_data := jsonb_set(
        next_data,
        '{attachments}',
        public.sanitize_field_project_attachments(p_data -> 'attachments', '[]'::jsonb),
        true
      );
    else
      if viewer_role = 'usta'
        and coalesce(old_data ->> 'assignedMasterId', '') <> auth.uid()::text then
        raise exception 'Bu proje size atanmamış.' using errcode = '42501';
      end if;
      next_data := p_data;
      foreach immutable_key in array array[
        'id', 'customerId', 'surveyId', 'type', 'createdAt',
        'assignedMasterId', 'ownerId', 'owner', 'stages'
      ]
      loop
        if old_data ? immutable_key then
          next_data := jsonb_set(next_data, array[immutable_key], old_data -> immutable_key, true);
        end if;
      end loop;

      -- Saha rolleri yönetici onayını veya eklerin onay/yorum alanlarını
      -- istemci yükü üzerinden değiştiremez.
      next_data := jsonb_set(
        next_data - 'adminApproved',
        '{adminApproved}',
        coalesce(old_data -> 'adminApproved', 'false'::jsonb),
        true
      );
      next_data := jsonb_set(
        next_data,
        '{attachments}',
        public.sanitize_field_project_attachments(next_data -> 'attachments', old_data -> 'attachments'),
        true
      );

      old_stage := case
        when jsonb_typeof(old_data -> 'currentStage') = 'number' then (old_data ->> 'currentStage')::integer
        else 0
      end;
      requested_stage := case
        when jsonb_typeof(next_data -> 'currentStage') = 'number' then (next_data ->> 'currentStage')::integer
        else old_stage
      end;
      last_stage := greatest(
        jsonb_array_length(case when jsonb_typeof(old_data -> 'stages') = 'array' then old_data -> 'stages' else '[]'::jsonb end) - 1,
        0
      );

      if requested_stage < 0 or requested_stage > last_stage then
        raise exception 'Proje aşaması sınırların dışında.' using errcode = '22023';
      end if;

      if viewer_role = 'usta' then
        if requested_stage <> old_stage and not (old_stage = 0 and requested_stage = 1) then
          raise exception 'Usta yalnız ilk uygulama aşamasını tamamlayabilir.' using errcode = '42501';
        end if;
      elsif requested_stage < old_stage or requested_stage > least(old_stage + 1, last_stage) then
        raise exception 'Proje aşaması yalnız sıradaki adıma ilerletilebilir.' using errcode = '22023';
      end if;
      next_data := jsonb_set(next_data, '{currentStage}', to_jsonb(requested_stage), true);
    end if;
  end if;

  insert into public.app_records(organization_id, entity_type, entity_id, data)
  values (viewer_organization, p_entity_type, p_entity_id, next_data)
  on conflict (organization_id, entity_type, entity_id)
  do update set data = excluded.data;
end;
$$;

revoke all on function public.save_field_app_record(text, text, jsonb) from public, anon;
grant execute on function public.save_field_app_record(text, text, jsonb) to authenticated;

-- Base tablo saha rollerine hiçbir satır göstermez ve doğrudan yazdırmaz.
-- Yönetici tam erişimini, müşteri ise mevcut sınırlı okumasını korur.
drop policy if exists records_select_by_role on public.app_records;
create policy records_select_by_role on public.app_records for select to authenticated
using (
  organization_id = public.current_organization_id()
  and (
    public.current_app_role() = 'admin'
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
  and public.current_app_role() = 'admin'
);

drop policy if exists records_update_by_role on public.app_records;
create policy records_update_by_role on public.app_records for update to authenticated
using (
  organization_id = public.current_organization_id()
  and public.current_app_role() = 'admin'
)
with check (
  organization_id = public.current_organization_id()
  and public.current_app_role() = 'admin'
);

-- Hassas veri içermeyen değişiklik sinyali, saha istemcilerinin güvenli RPC'yi
-- tekrar çağırarak güncel veriyi almasını sağlar.
create table if not exists public.app_record_events (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  changed_at timestamptz not null default now(),
  primary key (organization_id, entity_type, entity_id)
);

alter table public.app_record_events enable row level security;

revoke all on public.app_record_events from anon;
revoke insert, update, delete on public.app_record_events from authenticated;
grant select on public.app_record_events to authenticated;

drop policy if exists record_events_select_organization on public.app_record_events;
create policy record_events_select_organization on public.app_record_events for select to authenticated
using (
  organization_id = public.current_organization_id()
  and (
    public.current_app_role() = 'admin'
    or (public.current_app_role() in ('usta', 'proje') and entity_type <> 'payment')
  )
);

create or replace function public.signal_app_record_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_organization uuid;
  changed_type text;
  changed_id text;
begin
  if tg_op = 'DELETE' then
    changed_organization := old.organization_id;
    changed_type := old.entity_type;
    changed_id := old.entity_id;
  else
    changed_organization := new.organization_id;
    changed_type := new.entity_type;
    changed_id := new.entity_id;
  end if;

  insert into public.app_record_events(organization_id, entity_type, entity_id, changed_at)
  values (changed_organization, changed_type, changed_id, clock_timestamp())
  on conflict (organization_id, entity_type, entity_id)
  do update set changed_at = excluded.changed_at;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.signal_app_record_change() from public, anon, authenticated;

drop trigger if exists app_records_signal_change on public.app_records;
create trigger app_records_signal_change
after insert or update or delete on public.app_records
for each row execute function public.signal_app_record_change();

do $$ begin
  alter publication supabase_realtime add table public.app_record_events;
exception when duplicate_object then null;
end $$;
