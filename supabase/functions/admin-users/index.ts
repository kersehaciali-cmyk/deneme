import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const validRoles = ['admin', 'usta', 'proje', 'musteri']

function normalizeUser(input: unknown) {
  const user = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  const name = String(user.name ?? '').trim()
  const role = String(user.role ?? '')
  const realEmail = String(user.email ?? '').trim().toLowerCase()
  const phone = String(user.phone ?? '').trim()
  const phoneDigits = phone.replace(/\D/g, '')
  if (!name) throw new Error('Ad soyad alanı boş bırakılamaz.')
  if (phoneDigits.length < 10) throw new Error(`Telefon numarası en az 10 rakam içermelidir. ${phoneDigits.length} rakam algılandı.`)
  if (!validRoles.includes(role)) throw new Error(`Geçersiz kullanıcı rolü: ${role || 'boş'}.`)
  if (role === 'musteri' && !user.customerId) throw new Error('Müşteri hesabı için bağlı cari kaydı gerekir.')
  return {
    id: user.id ? String(user.id) : undefined,
    name,
    role,
    realEmail,
    phone,
    phoneDigits,
    customerId: user.customerId ? String(user.customerId) : undefined,
    active: user.active !== false,
  }
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'İşlem başarısız.'
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) throw new Error('Oturum bilgisi bulunamadı.')
    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
    const adminClient = createClient(url, serviceKey)
    const { data: auth, error: authError } = await callerClient.auth.getUser()
    if (authError || !auth.user) throw new Error('Geçersiz oturum.')
    const { data: caller, error: profileError } = await adminClient.from('profiles').select('organization_id,role,active').eq('id', auth.user.id).single()
    if (profileError || !caller?.active || caller.role !== 'admin') throw new Error('Bu işlem için yönetici yetkisi gerekir.')

    const body = await request.json()
    const action = String(body.action ?? '')

    if (action === 'bulkUpsert') {
      if (!Array.isArray(body.users) || body.users.length === 0) throw new Error('İçe aktarılacak kullanıcı bulunamadı.')
      if (body.users.length > 50) throw new Error('Tek işlemde en fazla 50 kullanıcı eklenebilir.')
      const { data: organizationProfiles, error: profilesError } = await adminClient.from('profiles').select('id,name,phone,email,role,active,customer_id').eq('organization_id', caller.organization_id)
      if (profilesError) throw profilesError
      const profilesByPhone = new Map((organizationProfiles ?? []).map((profile) => [String(profile.phone ?? '').replace(/\D/g, ''), profile]))
      const results: Array<Record<string, unknown>> = []

      for (let index = 0; index < body.users.length; index += 1) {
        try {
          const normalized = normalizeUser(body.users[index])
          const password = String((body.users[index] as Record<string, unknown>)?.password ?? '')
          if (password.length < 8) throw new Error('Şifre en az 8 karakter olmalıdır.')
          if (normalized.customerId) {
            const { data: customer, error: customerError } = await adminClient.from('app_records').select('entity_id').eq('organization_id', caller.organization_id).eq('entity_type', 'customer').eq('entity_id', normalized.customerId).maybeSingle()
            if (customerError) throw customerError
            if (!customer) throw new Error('Bağlı müşteri kaydı bu şirkette bulunamadı.')
          }
          const existing = profilesByPhone.get(normalized.phoneDigits)
          const effectiveEmail = normalized.realEmail || String(existing?.email ?? '').trim().toLowerCase()
          const authenticationEmail = effectiveEmail || `${normalized.phoneDigits}@phone.tesisatpro.local`
          const metadata = { name: normalized.name, phone: normalized.phone, role: normalized.role, customer_id: normalized.customerId ?? null, organization_id: caller.organization_id }
          let userId: string
          let status: 'created' | 'updated'

          if (existing) {
            if (existing.id === auth.user.id && !normalized.active) throw new Error('Kendi yönetici hesabınızı pasif yapamazsınız.')
            if (existing.id === auth.user.id && normalized.role !== 'admin') throw new Error('Kendi yönetici yetkinizi kaldıramazsınız.')
            const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(existing.id, { email: authenticationEmail, email_confirm: true, password, user_metadata: metadata })
            if (authUpdateError) throw authUpdateError
            userId = existing.id
            status = 'updated'
          } else {
            const { data: created, error: createError } = await adminClient.auth.admin.createUser({ email: authenticationEmail, password, email_confirm: true, user_metadata: metadata })
            if (createError) throw createError
            if (!created.user) throw new Error('Kullanıcı hesabı oluşturulamadı.')
            userId = created.user.id
            status = 'created'
          }

          const profile = { id: userId, organization_id: caller.organization_id, customer_id: normalized.customerId ?? null, name: normalized.name, phone: normalized.phone, email: effectiveEmail, role: normalized.role, active: normalized.active }
          const { error: upsertError } = await adminClient.from('profiles').upsert(profile)
          if (upsertError) {
            if (status === 'created') await adminClient.auth.admin.deleteUser(userId)
            throw upsertError
          }
          profilesByPhone.set(normalized.phoneDigits, profile)
          results.push({ index, name: normalized.name, phone: normalized.phone, status })
        } catch (error) {
          const raw = body.users[index] && typeof body.users[index] === 'object' ? body.users[index] as Record<string, unknown> : {}
          results.push({ index, name: String(raw.name ?? '').trim(), phone: String(raw.phone ?? '').trim(), status: 'error', error: errorText(error) })
        }
      }

      return new Response(JSON.stringify({ ok: results.every((result) => result.status !== 'error'), results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'resetProjects') {
      if (!['PROJELERİ SIFIRLA', 'PROJELERI SIFIRLA'].includes(String(body.confirmation ?? ''))) throw new Error('Projeleri sıfırlamak için onay metni geçersiz.')
      const [{ data: operationalRecords, error: recordsError }, { data: surveyRecords, error: surveysError }, { data: customerRecords, error: customersError }] = await Promise.all([
        adminClient.from('app_records').select('entity_type,entity_id,data').eq('organization_id', caller.organization_id).in('entity_type', ['project', 'job']),
        adminClient.from('app_records').select('entity_id,data').eq('organization_id', caller.organization_id).eq('entity_type', 'survey'),
        adminClient.from('app_records').select('entity_id,data').eq('organization_id', caller.organization_id).eq('entity_type', 'customer'),
      ])
      if (recordsError) throw recordsError
      if (surveysError) throw surveysError
      if (customersError) throw customersError

      const surveyUpdates = (surveyRecords ?? []).filter((record) => record.data?.status === 'Projeye Dönüştü').map((record) => ({ organization_id: caller.organization_id, entity_type: 'survey', entity_id: record.entity_id, data: { ...record.data, status: 'Kabul Edildi' } }))
      const customerUpdates = (customerRecords ?? []).map((record) => ({ organization_id: caller.organization_id, entity_type: 'customer', entity_id: record.entity_id, data: { ...record.data, openProjectCount: 0 } }))
      if (surveyUpdates.length > 0) {
        const { error } = await adminClient.from('app_records').upsert(surveyUpdates)
        if (error) throw error
      }
      if (customerUpdates.length > 0) {
        const { error } = await adminClient.from('app_records').upsert(customerUpdates)
        if (error) throw error
      }
      const projectRecords = (operationalRecords ?? []).filter((record) => record.entity_type === 'project')
      const projectIds = new Set(projectRecords.map((record) => record.entity_id))
      const linkedJobIds = (operationalRecords ?? [])
        .filter((record) => record.entity_type === 'job' && record.data?.projectId && projectIds.has(String(record.data.projectId)))
        .map((record) => record.entity_id)
      const { error: projectDeleteError } = await adminClient.from('app_records').delete().eq('organization_id', caller.organization_id).eq('entity_type', 'project')
      if (projectDeleteError) throw projectDeleteError
      if (linkedJobIds.length > 0) {
        const { error: jobDeleteError } = await adminClient.from('app_records').delete().eq('organization_id', caller.organization_id).eq('entity_type', 'job').in('entity_id', linkedJobIds)
        if (jobDeleteError) throw jobDeleteError
      }
      const projectCount = projectRecords.length
      const jobCount = linkedJobIds.length
      return new Response(JSON.stringify({ ok: true, deleted: { projects: projectCount, jobs: jobCount }, reset: { surveys: surveyUpdates.length, customers: customerUpdates.length } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const user = body.user ?? {}
    const normalized = normalizeUser(user)
    const { name, role, realEmail, phone, phoneDigits, customerId, active } = normalized
    if (customerId) {
      const { data: customer } = await adminClient.from('app_records').select('entity_id').eq('organization_id', caller.organization_id).eq('entity_type', 'customer').eq('entity_id', user.customerId).maybeSingle()
      if (!customer) throw new Error('Bağlı müşteri kaydı bu şirkette bulunamadı.')
    }
    const authenticationEmail = realEmail || `${phoneDigits}@phone.tesisatpro.local`
    const metadata = { name, phone, role, customer_id: customerId ?? null, organization_id: caller.organization_id }

    if (action === 'create') {
      let createdUser
      if (realEmail) {
        const redirectTo = Deno.env.get('PUBLIC_APP_URL') || undefined
        const { data, error } = await adminClient.auth.admin.inviteUserByEmail(realEmail, { redirectTo, data: metadata })
        if (error) throw error
        createdUser = data.user
      } else {
        if (String(body.password ?? '').length < 8) throw new Error('E-postasız kullanıcı için en az 8 karakterli ilk şifre gerekir.')
        const { data, error } = await adminClient.auth.admin.createUser({ email: authenticationEmail, password: body.password, email_confirm: true, user_metadata: metadata })
        if (error) throw error
        createdUser = data.user
      }
      if (!createdUser) throw new Error('Kullanıcı hesabı oluşturulamadı.')
      const { error: upsertError } = await adminClient.from('profiles').upsert({ id: createdUser.id, organization_id: caller.organization_id, customer_id: customerId ?? null, name, phone, email: realEmail, role, active })
      if (upsertError) throw upsertError
    } else if (action === 'update') {
      if (!user.id) throw new Error('Kullanıcı kimliği bulunamadı.')
      const { data: target } = await adminClient.from('profiles').select('organization_id').eq('id', user.id).single()
      if (target?.organization_id !== caller.organization_id) throw new Error('Başka şirkete ait kullanıcı değiştirilemez.')
      if (user.id === auth.user.id && !active) throw new Error('Kendi yönetici hesabınızı pasif yapamazsınız.')
      if (user.id === auth.user.id && role !== 'admin') throw new Error('Kendi yönetici yetkinizi kaldıramazsınız.')
      const attributes: Record<string, unknown> = { email: authenticationEmail, email_confirm: true, user_metadata: metadata }
      if (body.password) {
        if (String(body.password).length < 8) throw new Error('Şifre en az 8 karakter olmalıdır.')
        attributes.password = body.password
      }
      const { error } = await adminClient.auth.admin.updateUserById(user.id, attributes)
      if (error) throw error
      const { error: updateError } = await adminClient.from('profiles').update({ customer_id: customerId ?? null, name, phone, email: realEmail, role, active }).eq('id', user.id).eq('organization_id', caller.organization_id)
      if (updateError) throw updateError
    } else throw new Error('Geçersiz işlem.')

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'İşlem başarısız.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

