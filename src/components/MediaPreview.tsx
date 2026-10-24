import { useEffect, useState } from 'react'
import { loadMediaFileUrl } from '../lib/mediaStore'

export function MediaPreview({ id, url, type, alt }: { id: string; url: string; type: 'image' | 'video'; alt: string }) {
  const [source, setSource] = useState(url)

  useEffect(() => {
    let generatedUrl: string | undefined
    let retryTimer: number | undefined
    let active = true
    const load = (attempt = 0) => {
      loadMediaFileUrl(id).then((storedUrl) => {
        if (!active) return
        if (!storedUrl && attempt < 3) {
          retryTimer = window.setTimeout(() => load(attempt + 1), 1800)
          return
        }
        if (!storedUrl) return
        generatedUrl = storedUrl
        setSource(storedUrl)
      }).catch(() => {
        if (active && attempt < 3) retryTimer = window.setTimeout(() => load(attempt + 1), 1800)
      })
    }
    load()
    return () => {
      active = false
      if (retryTimer) window.clearTimeout(retryTimer)
      if (generatedUrl) URL.revokeObjectURL(generatedUrl)
    }
  }, [id])

  return type === 'video'
    ? <video src={source} controls preload="metadata" aria-label={alt} />
    : <a href={source} target="_blank" rel="noreferrer"><img src={source} alt={alt} /></a>
}
