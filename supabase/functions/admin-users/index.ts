import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const user = body.user ?? {}
    if (!user.email || !user.name || !['admin', 'usta', 'proje', 'musteri'].includes(user.role)) throw new Error('Kullanıcı bilgileri eksik veya geçersiz.')
    if (user.role === 'musteri' && !user.customerId) throw new Error('Müşteri hesabı için bağlı cari kaydı gerekir.')
    if (user.customerId) {
      const { data: customer } = await adminClient.from('app_records').select('entity_id').eq('organization_id', caller.organization_id).eq('entity_type', 'customer').eq('entity_id', user.customerId).maybeSingle()
      if (!customer) throw new Error('Bağlı müşteri kaydı bu şirkette bulunamadı.')
    }

    if (action === 'create') {
      const redirectTo = Deno.env.get('PUBLIC_APP_URL') || undefined
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(user.email, {
        redirectTo,
        data: { name: user.name, phone: user.phone ?? '', role: user.role, customer_id: user.customerId ?? null, organization_id: caller.organization_id },
      })
      if (error) throw error
      if (!data.user) throw new Error('Kullanıcı hesabı oluşturulamadı.')
      const { error: upsertError } = await adminClient.from('profiles').upsert({ id: data.user.id, organization_id: caller.organization_id, customer_id: user.customerId ?? null, name: user.name, phone: user.phone ?? '', email: user.email, role: user.role, active: user.active !== false })
      if (upsertError) throw upsertError
    } else if (action === 'update') {
      if (!user.id) throw new Error('Kullanıcı kimliği bulunamadı.')
      const { data: target } = await adminClient.from('profiles').select('organization_id').eq('id', user.id).single()
      if (target?.organization_id !== caller.organization_id) throw new Error('Başka şirkete ait kullanıcı değiştirilemez.')
      if (user.id === auth.user.id && user.active === false) throw new Error('Kendi yönetici hesabınızı pasif yapamazsınız.')
      const attributes: Record<string, unknown> = { email: user.email, user_metadata: { name: user.name, phone: user.phone ?? '', role: user.role, customer_id: user.customerId ?? null, organization_id: caller.organization_id } }
      if (body.password) {
        if (String(body.password).length < 8) throw new Error('Şifre en az 8 karakter olmalıdır.')
        attributes.password = body.password
      }
      const { error } = await adminClient.auth.admin.updateUserById(user.id, attributes)
      if (error) throw error
      const { error: updateError } = await adminClient.from('profiles').update({ customer_id: user.customerId ?? null, name: user.name, phone: user.phone ?? '', email: user.email, role: user.role, active: user.active !== false }).eq('id', user.id).eq('organization_id', caller.organization_id)
      if (updateError) throw updateError
    } else throw new Error('Geçersiz işlem.')

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'İşlem başarısız.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

