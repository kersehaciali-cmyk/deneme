import { useEffect, useState } from 'react'
import { loadMediaFileUrl } from '../lib/mediaStore'

export function MediaPreview({ id, url, type, alt }: { id: string; url: string; type: 'image' | 'video'; alt: string }) {
  const [source, setSource] = useState(url)

  useEffect(() => {
    let generatedUrl: string | undefined
    let active = true
    loadMediaFileUrl(id).then((storedUrl) => {
      if (!active || !storedUrl) return
      generatedUrl = storedUrl
      setSource(storedUrl)
    }).catch(() => undefined)
    return () => {
      active = false
      if (generatedUrl) URL.revokeObjectURL(generatedUrl)
    }
  }, [id])

  return type === 'video'
    ? <video src={source} controls preload="metadata" aria-label={alt} />
    : <a href={source} target="_blank" rel="noreferrer"><img src={source} alt={alt} /></a>
}
