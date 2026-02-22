export async function getPlaybackState(accessToken) {
  const response = await fetch('https://api.spotify.com/v1/me/player', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (response.status === 204) {
    return null
  }

  if (!response.ok) {
    return null
  }

  return response.json().catch(() => null)
}

export async function startPlaybackWithUri(accessToken, uri) {
  return startPlaybackWithUris(accessToken, [uri])
}

export async function startPlaybackWithUris(accessToken, uris) {
  if (!Array.isArray(uris) || uris.length === 0) {
    throw new Error('No hay canciones para iniciar reproduccion.')
  }

  const response = await fetch('https://api.spotify.com/v1/me/player/play', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uris,
    }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload?.error?.message || 'No se pudo iniciar la reproduccion automatica.')
  }
}

export async function enqueueTrackUrisSequentially(accessToken, uris, onProgress, onFirstEnqueued) {
  const total = uris.length
  if (typeof onProgress === 'function') {
    onProgress({ completed: 0, total, percent: total ? 0 : 100 })
  }

  for (let index = 0; index < uris.length; index += 1) {
    const uri = uris[index]
    let response = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    // Retry breve para fallos transitorios de dispositivo/rate-limit.
    if (!response.ok && (response.status === 429 || response.status >= 500)) {
      await new Promise((resolve) => setTimeout(resolve, 250))
      response = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload?.error?.message || `No se pudo agregar ${uri} a la cola.`)
    }

    if (index === 0 && typeof onFirstEnqueued === 'function') {
      // No bloquea el loop de subida de cola.
      Promise.resolve(onFirstEnqueued(uri)).catch(() => {})
    }

    if (typeof onProgress === 'function') {
      const completed = index + 1
      onProgress({
        completed,
        total,
        percent: total ? Math.round((completed / total) * 100) : 100,
      })
    }
  }
}
