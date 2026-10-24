import { supabase } from './supabase'

const databaseName = 'tesisat-pro-media'
const storeName = 'files'

async function cloudPath(id: string) {
  if (!supabase) return undefined
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return undefined
  const { data } = await supabase.from('profiles').select('organization_id').eq('id', auth.user.id).single()
  if (!data?.organization_id) return undefined
  return `${data.organization_id}/${id.replace(/[^a-zA-Z0-9._-]/g, '_')}`
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveMediaFile(id: string, file: File) {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    transaction.objectStore(storeName).put(file, id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
  const path = await cloudPath(id)
  if (path && supabase) {
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true, contentType: file.type || undefined })
    if (error) throw error
  }
}

export async function loadMediaFileUrl(id: string) {
  const database = await openDatabase()
  const file = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = database.transaction(storeName, 'readonly').objectStore(storeName).get(id)
    request.onsuccess = () => resolve(request.result as Blob | undefined)
    request.onerror = () => reject(request.error)
  })
  database.close()
  if (file) return URL.createObjectURL(file)
  const path = await cloudPath(id)
  if (!path || !supabase) return undefined
  const { data, error } = await supabase.storage.from('media').createSignedUrl(path, 60 * 60)
  if (error) return undefined
  return data.signedUrl
}

export async function deleteMediaFile(id: string) {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    transaction.objectStore(storeName).delete(id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
  const path = await cloudPath(id)
  if (path && supabase) {
    const { error } = await supabase.storage.from('media').remove([path])
    if (error) throw error
  }
}
