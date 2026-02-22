import { useEffect, useMemo, useState } from 'react'
import ArtistSelector from './components/ArtistSelector'
import GenerateButton from './components/GenerateButton'
import LoginCard from './components/LoginCard'
import SearchBar from './components/SearchBar'
import SelectedArtists from './components/SelectedArtists'
import SuccessCard from './components/SuccessCard'

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || ''
const SPOTIFY_REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:5173/callback'
const SPOTIFY_SCOPES = [
  'user-read-email',
  'playlist-modify-public',
  'playlist-modify-private',
]

const TOKEN_STORAGE_KEY = 'mixtape_spotify_access_token'
const TOKEN_EXPIRES_AT_STORAGE_KEY = 'mixtape_spotify_access_token_expires_at'
const CODE_VERIFIER_STORAGE_KEY = 'mixtape_spotify_code_verifier'
const STATE_STORAGE_KEY = 'mixtape_spotify_oauth_state'

const MOCK_ARTISTS = [
  { id: '1', name: 'Daft Punk', image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd847f5f?auto=format&fit=crop&w=200&q=80' },
  { id: '2', name: 'Rosalia', image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=200&q=80' },
  { id: '3', name: 'Arctic Monkeys', image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=200&q=80' },
  { id: '4', name: 'Tame Impala', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=200&q=80' },
  { id: '5', name: 'Billie Eilish', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=200&q=80' },
  { id: '6', name: 'The Weeknd', image: 'https://images.unsplash.com/photo-1501612780327-45045538702b?auto=format&fit=crop&w=200&q=80' },
  { id: '7', name: 'Bad Bunny', image: 'https://images.unsplash.com/photo-1445985543470-41fba5c3144a?auto=format&fit=crop&w=200&q=80' },
  { id: '8', name: 'Lana Del Rey', image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=200&q=80' },
]

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const randomValues = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(randomValues, (value) => chars[value % chars.length]).join('')
}

function base64UrlEncode(arrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(digest)
}

function getStoredToken() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  const expiresAt = Number(localStorage.getItem(TOKEN_EXPIRES_AT_STORAGE_KEY) || '0')

  if (!token) {
    return null
  }

  if (expiresAt && Date.now() >= expiresAt) {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(TOKEN_EXPIRES_AT_STORAGE_KEY)
    return null
  }

  return token
}

async function buildSpotifyAuthUrl() {
  const state = generateRandomString(16)
  const verifier = generateRandomString(64)
  const challenge = await generateCodeChallenge(verifier)

  sessionStorage.setItem(STATE_STORAGE_KEY, state)
  sessionStorage.setItem(CODE_VERIFIER_STORAGE_KEY, verifier)

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state,
    scope: SPOTIFY_SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })

  return `https://accounts.spotify.com/authorize?${params.toString()}`
}

async function exchangeCodeForToken(code) {
  const verifier = sessionStorage.getItem(CODE_VERIFIER_STORAGE_KEY)
  if (!verifier) {
    throw new Error('No se encontro code_verifier. Reinicia el login desde el boton.')
  }

  const body = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    code_verifier: verifier,
  })

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error_description || 'No se pudo completar la autenticacion de Spotify.')
  }

  return payload
}

async function fetchSpotifyProfile(accessToken) {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error?.message || 'No se pudo cargar tu perfil de Spotify.')
  }

  return payload
}

async function mockSearchArtists(query) {
  await delay(500)
  if (!query.trim()) {
    return []
  }

  return MOCK_ARTISTS.filter((artist) => artist.name.toLowerCase().includes(query.toLowerCase()))
}

async function mockGeneratePlaylist(artists) {
  await delay(1600)
  const names = artists.map((artist) => artist.name).join(' & ')

  return {
    name: `mixTape: ${names}`,
    url: 'https://open.spotify.com/',
  }
}

function App() {
  const [token, setToken] = useState(() => getStoredToken())
  const [profile, setProfile] = useState(null)
  const [authError, setAuthError] = useState('')
  const [isAuthLoading, setIsAuthLoading] = useState(false)

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedArtists, setSelectedArtists] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [playlist, setPlaylist] = useState(null)

  const selectedIds = useMemo(() => new Set(selectedArtists.map((artist) => artist.id)), [selectedArtists])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const oauthError = params.get('error')

    if (oauthError) {
      setAuthError('Spotify rechazo el login. Revisa permisos y Redirect URI.')
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

    if (!code) {
      return
    }

    const expectedState = sessionStorage.getItem(STATE_STORAGE_KEY)
    if (!expectedState || state !== expectedState) {
      setAuthError('Estado OAuth invalido. Reintenta iniciar sesion.')
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

    const completeAuth = async () => {
      setIsAuthLoading(true)
      setAuthError('')

      try {
        const tokenResponse = await exchangeCodeForToken(code)
        const expiresIn = Number(tokenResponse.expires_in || 3600)
        const expiresAt = Date.now() + expiresIn * 1000

        localStorage.setItem(TOKEN_STORAGE_KEY, tokenResponse.access_token)
        localStorage.setItem(TOKEN_EXPIRES_AT_STORAGE_KEY, String(expiresAt))
        setToken(tokenResponse.access_token)
      } catch (authExchangeError) {
        setAuthError(authExchangeError.message)
      } finally {
        sessionStorage.removeItem(CODE_VERIFIER_STORAGE_KEY)
        sessionStorage.removeItem(STATE_STORAGE_KEY)
        setIsAuthLoading(false)
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }

    completeAuth()
  }, [])

  useEffect(() => {
    if (!token) {
      setProfile(null)
      return
    }

    const loadProfile = async () => {
      setIsAuthLoading(true)
      setAuthError('')

      try {
        const me = await fetchSpotifyProfile(token)
        setProfile(me)
      } catch (profileError) {
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        localStorage.removeItem(TOKEN_EXPIRES_AT_STORAGE_KEY)
        setToken(null)
        setProfile(null)
        setAuthError(profileError.message)
      } finally {
        setIsAuthLoading(false)
      }
    }

    loadProfile()
  }, [token])

  const handleConnect = async () => {
    setAuthError('')

    if (!SPOTIFY_CLIENT_ID) {
      setAuthError('Falta VITE_SPOTIFY_CLIENT_ID en frontend/.env')
      return
    }

    setIsAuthLoading(true)
    try {
      const authUrl = await buildSpotifyAuthUrl()
      window.location.href = authUrl
    } catch {
      setIsAuthLoading(false)
      setAuthError('No se pudo iniciar el login con Spotify.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(TOKEN_EXPIRES_AT_STORAGE_KEY)
    sessionStorage.removeItem(CODE_VERIFIER_STORAGE_KEY)
    sessionStorage.removeItem(STATE_STORAGE_KEY)
    setToken(null)
    setProfile(null)
    setAuthError('')
  }

  const handleQueryChange = async (value) => {
    setQuery(value)
    setPlaylist(null)

    if (!value.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    const results = await mockSearchArtists(value)
    setSearchResults(results)
    setIsSearching(false)
  }

  const handleSelectArtist = (artist) => {
    setPlaylist(null)

    if (selectedIds.has(artist.id)) {
      return
    }

    setSelectedArtists((current) => [...current, artist])
  }

  const handleRemoveArtist = (artistId) => {
    setPlaylist(null)
    setSelectedArtists((current) => current.filter((artist) => artist.id !== artistId))
  }

  const handleGenerate = async () => {
    if (selectedArtists.length < 2) {
      return
    }

    setIsGenerating(true)
    const createdPlaylist = await mockGeneratePlaylist(selectedArtists)
    setPlaylist(createdPlaylist)
    setIsGenerating(false)
  }

  if (!token || !profile) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-8 text-zinc-100">
        <div className="pointer-events-none absolute -left-16 top-0 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-lime-400/10 blur-3xl" />
        <LoginCard onConnect={handleConnect} isLoading={isAuthLoading} errorMessage={authError} />
      </main>
    )
  }

  const profileImage = profile.images?.[0]?.url

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <header className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-emerald-400">Spotify Playlist Builder</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">mixTape <span aria-hidden="true">📼</span></h1>
              <p className="mt-2 text-sm text-zinc-300">Buscá artistas, seleccioná al menos dos y generá tu playlist al instante.</p>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2">
              {profileImage ? (
                <img src={profileImage} alt={profile.display_name || 'Spotify profile'} className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-zinc-200">
                  {(profile.display_name || 'SP').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <p className="max-w-[180px] truncate text-sm font-semibold text-zinc-100">{profile.display_name || 'Usuario Spotify'}</p>
                <p className="max-w-[180px] truncate text-xs text-zinc-400">{profile.email || 'Cuenta conectada'}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-zinc-600 px-2 py-1 text-xs text-zinc-200 transition hover:border-zinc-400"
              >
                Salir
              </button>
            </div>
          </div>
        </header>

        <SelectedArtists artists={selectedArtists} onRemove={handleRemoveArtist} />
        <SearchBar value={query} onChange={handleQueryChange} isLoading={isSearching} />
        <ArtistSelector results={searchResults} selectedIds={selectedIds} onSelect={handleSelectArtist} />
        <GenerateButton disabled={selectedArtists.length < 2} isLoading={isGenerating} onClick={handleGenerate} />
        <SuccessCard playlistUrl={playlist?.url} playlistName={playlist?.name} />
      </div>
    </main>
  )
}

export default App
