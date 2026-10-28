# djstrap

**DJ Strap** es una consola DJ online hecha con Next.js: dos decks, mixer, efectos, playlists, comunidad de mezclas y app de escritorio para Windows. Funciona en PC, tablet y celular.

## Funciones

- **Cabina DJ:** 2 decks con jog (scratch), tempo, SYNC, hot cues, loops, beat jump, sampler; mixer con EQ de 3 bandas, filtro, Beat FX (echo, reverb, flanger, trans), micrófono, salida de auriculares y crossfader.
- **Buscar música:** canciones de YouTube sin clave de API, o archivos de audio propios (MP3, WAV…).
- **Playlists estilo Spotify:** con nombre, ocasión y foto de portada propia.
- **Auto-Mix:** la app mezcla sola entre los dos decks.
- **Grabar y publicar mezclas:** la comunidad puede escucharlas, darles me gusta, comentarlas y guardarlas.
- **Cuentas de usuario:** perfil con foto y bio, cambio de contraseña y eliminar cuenta. Cada usuario tiene sus propios datos.
- **Panel de administrador** (solo web): usuarios activos ahora, registros, descargas de la app y visitas.
- **SEO:** página de inicio pública, sitemap, robots y datos estructurados.
- **App de escritorio:** instalador de Windows con Electron.

> Las pistas de YouTube solo permiten volumen, tempo, cues y crossfader: el navegador no deja procesar su audio. Para EQ, efectos, loops, scratch y BPM se usan archivos de audio locales.

## Requisitos

- Node.js 18.17 o superior

## Uso

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

### Producción

```bash
npm run build
npm start
```

Define `SITE_URL` con tu dominio (por ejemplo `SITE_URL=https://djstrap.com`) para que el SEO y el sitemap usen la dirección correcta. Los datos se guardan en la carpeta `data/`, así que el hosting debe tener disco permanente (Render, Railway, un VPS…).

### Cuenta de administrador

Con el servidor encendido:

```bash
npm run admin:create -- nombre_admin
```

La contraseña generada se guarda en `ADMIN-CREDENCIALES.txt` (no se sube al repositorio). Cámbiala desde "Mi perfil" al entrar.

### App de escritorio (Windows)

```bash
npm run dist:win
```

El instalador queda en `dist/DJStrap-Setup-<versión>.exe`.

### Prueba de carga

```bash
npm run build
npx next start -p 3100
npm run loadtest -- http://localhost:3100 100
```

Simula 100 usuarios a la vez y comprueba que cada uno solo vea sus propios datos.
