import os
from urllib.parse import urlencode

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

load_dotenv()

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "http://127.0.0.1:8000/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")

SPOTIFY_ACCOUNTS_BASE = "https://accounts.spotify.com"

app = FastAPI(title="mixTape API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _validate_env() -> None:
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Faltan SPOTIFY_CLIENT_ID o SPOTIFY_CLIENT_SECRET en el archivo .env",
        )


@app.get("/health")
def health_check():
    return {"ok": True, "service": "mixTape-backend"}


@app.get("/login")
def login():
    """Redirige al usuario al consentimiento/login oficial de Spotify."""
    _validate_env()

    scopes = " ".join(
        [
            "user-top-read",
            "playlist-modify-public",
            "playlist-modify-private",
        ]
    )

    params = {
        "client_id": SPOTIFY_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": SPOTIFY_REDIRECT_URI,
        "scope": scopes,
    }

    auth_url = f"{SPOTIFY_ACCOUNTS_BASE}/authorize?{urlencode(params)}"
    return RedirectResponse(url=auth_url, status_code=307)


@app.get("/callback")
def callback(code: str = Query(..., description="Authorization code de Spotify")):
    """Intercambia code por access_token y redirige al frontend con el token."""
    _validate_env()

    token_response = requests.post(
        f"{SPOTIFY_ACCOUNTS_BASE}/api/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": SPOTIFY_REDIRECT_URI,
            "client_id": SPOTIFY_CLIENT_ID,
            "client_secret": SPOTIFY_CLIENT_SECRET,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=20,
    )

    if token_response.status_code != 200:
        detail = token_response.json() if token_response.content else {"error": "token_exchange_failed"}
        raise HTTPException(status_code=token_response.status_code, detail=detail)

    token_payload = token_response.json()
    access_token = token_payload.get("access_token")

    if not access_token:
        raise HTTPException(status_code=502, detail="Spotify no devolvio access_token")

    redirect_url = f"{FRONTEND_URL}?{urlencode({'token': access_token})}"
    return RedirectResponse(url=redirect_url, status_code=307)
