# mixTape 📼

¿Alguna vez quisiste escuchar a dos o tres bandas específicas y la radio de Spotify te termina mezclando otros artistas que nada que ver? **mixTape** soluciona exactamente eso. 

Es una herramienta web ligera que te permite seleccionar tus artistas favoritos y genera automáticamente una playlist exclusiva con sus canciones, guardándola directamente en tu cuenta de Spotify.

### Características Principales
* **Autenticación Oficial:** Login seguro usando el flujo OAuth 2.0 de la API de Spotify.
* **Búsqueda Rápida:** Buscador de artistas en tiempo real para armar tu selección.
* **Generación a un clic:** Recopila los *top tracks* (o canciones específicas) de los artistas elegidos y crea la playlist en tu biblioteca en segundos.

### Stack Tecnológico
* **Frontend:** React y Vite
* **Backend / Lógica:** Python 
* **API:** Spotify Web API

### Instalación y Uso Local
Para correr este proyecto en tu computadora, vas a necesitar Node.js instalado y credenciales de desarrollador de Spotify.

1. Cloná este repositorio:
   `git clone https://github.com/tu-usuario/mixtape.git`
2. Entrá a la carpeta del proyecto:
   `cd mixtape`
3. Instalá las dependencias:
   `npm install`
4. Creá un archivo `.env` en la raíz del proyecto y agregá tus credenciales de Spotify (Client ID y Client Secret).
5. Levantá el servidor de desarrollo:
   `npm run dev`

### 🗺️ Próximos Pasos (Roadmap)
* [ ] Permitir al usuario elegir la cantidad exacta de canciones por artista.
* [ ] Agregar la opción de filtrar por álbumes específicos en lugar de solo los éxitos.
