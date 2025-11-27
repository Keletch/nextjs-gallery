# nextJs_InfiniteGallery

Galería interactiva de fotos de eventos con sistema de moderación, animaciones 3D con Three.js y gestión de imágenes mediante Supabase Storage.

## 🚀 Características

- **Galería 3D flotante** con imágenes animadas usando Three.js y React Three Fiber
- **Sistema de moderación** completo con autenticación de Google
- **Gestión de Eventos**: Crea eventos, actualiza logos y colores de fondo directamente desde el panel de moderación.
- **Subida de imágenes** con compresión automática y generación de thumbnails
- **Vista en cuadrícula** alternativa para navegación rápida
- **Múltiples eventos** con filtrado y selección dinámica
- **Compartir en redes sociales** con Open Graph metadata dinámico
- **Rate limiting** con Redis (Upstash) para prevenir spam
- **Optimizaciones de rendimiento** con lazy loading y límites de imágenes activas
- **Modo de pausa** cuando cambias de pestaña para ahorrar recursos
- **Diseño Responsivo** optimizado para móviles y escritorio

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript
- **3D Graphics**: Three.js + React Three Fiber + Drei
- **Base de datos**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Autenticación**: Supabase Auth (Google OAuth)
- **Styling**: CSS Modules + Tailwind CSS
- **Procesamiento de imágenes**: Sharp (server-side) + Canvas API (client-side)
- **Analytics**: Vercel Analytics + Speed Insights
- **Deployment**: Vercel

## 📋 Prerequisitos

- Node.js 18+ 
- Cuenta de Supabase
- Cuenta de Vercel (para deploy)
- Cuenta de Upstash (para Redis Rate Limiting)

## 🔧 Configuración de Supabase

### 1. Crear proyecto en Supabase

Ve a [supabase.com](https://supabase.com) y crea un nuevo proyecto.

### 2. Crear tablas

Ejecuta estos comandos SQL en el SQL Editor de Supabase:

```sql
-- Tabla de eventos
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  ruta TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#000000',
  logo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de información de imágenes
CREATE TABLE imageInfo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imghash TEXT UNIQUE NOT NULL,
  evento TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de logs de acciones
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  action TEXT NOT NULL,
  "from" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  moderator TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  device TEXT,
  browser TEXT,
  os TEXT,
  location TEXT,
  evento TEXT NOT NULL
);

-- Tabla de moderadores
CREATE TABLE moderators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Configurar Storage

1. Ve a **Storage** en el panel de Supabase
2. Crea un bucket público llamado `nextjsGallery`
3. Configura las políticas de acceso para lectura pública.

### 4. Estructura de carpetas en Storage

El sistema crea automáticamente esta estructura:
```
nextjsGallery/
├── logos/             # Logos de eventos
├── {nombre-evento}/
│   ├── approved/      # Imágenes aprobadas (visibles en galería)
│   ├── pending/       # Imágenes esperando moderación
│   ├── rejected/      # Imágenes rechazadas
│   └── thumbnails/    # Miniaturas para carga rápida
```

### 5. Configurar autenticación de Google

1. Ve a **Authentication > Providers** en Supabase
2. Habilita **Google**
3. Configura las credenciales OAuth de Google Cloud Console
4. Agrega los moderadores a la tabla `moderators`.

## 🚀 Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/nextJs_InfiniteGallery.git
cd nextJs_InfiniteGallery
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=tu-upstash-url
UPSTASH_REDIS_REST_TOKEN=tu-upstash-token

# Opcional: para producción
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
```

> **⚠️ Importante**: El `SUPABASE_SERVICE_ROLE_KEY` nunca debe exponerse al cliente. Solo se usa en rutas de API del servidor.

4. **Ejecutar en desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
nextJs_InfiniteGallery/
├── app/
│   ├── api/              # API Routes (backend)
│   │   ├── upload/       # Subida de imágenes
│   │   ├── create-event/ # Creación de eventos
│   │   ├── update-event-logo/ # Actualización de logos
│   │   └── ...
│   ├── gallery/          # Galería principal (3D y Grid)
│   ├── moderate/         # Panel de moderación
│   ├── upload/           # Formulario de subida
│   └── layout.tsx        # Layout raíz
├── lib/
│   ├── supabase.ts       # Cliente de Supabase (server)
│   ├── supabase-client.ts # Cliente de Supabase (browser)
│   ├── auth-check.ts     # Verificación de moderadores
│   └── rate-limit.ts     # Rate limiting con Redis
├── public/               # Archivos estáticos
└── next.config.ts        # Configuración de Next.js
```

## 🔒 Seguridad

El proyecto implementa múltiples capas de seguridad:

- **Rate limiting** con Redis (Upstash) para proteger endpoints críticos.
- **Validación de archivos** con Sharp (solo imágenes reales).
- **Autenticación de moderadores** vía Google OAuth + whitelist en base de datos.
- **Headers de seguridad** (Content Security Policy, Frame Options).
- **Honeypot** anti-bots en formularios.
- **Service Role Key** solo en servidor.

## 🎨 Personalización

### Colores de eventos

Los colores de fondo se gestionan dinámicamente desde el panel de moderación (`/moderate`), pero también se pueden definir defaults en la base de datos.

### Límite de imágenes flotantes

En `app/gallery/GalleryCanvas.tsx`, puedes ajustar el número máximo de imágenes flotantes simultáneas para optimizar el rendimiento.

## 🚀 Deploy en Vercel

1. **Push a GitHub**
2. **Importar en Vercel**
3. **Configurar variables de entorno** (incluyendo Supabase y Upstash)
4. **Deploy**

## 📝 Uso

### Para usuarios (subir fotos)

1. Ve a `/upload`
2. Selecciona el evento
3. Sube tu foto (quedará pendiente de moderación)

### Para moderadores

1. Inicia sesión en `/moderate`
2. Crea nuevos eventos o edita los existentes (logo, color).
3. Aprueba o rechaza imágenes pendientes.

### Ver galería

- **Modo 3D**: Vista por defecto con imágenes flotantes.
- **Modo Grid**: Click en el botón de cuadrícula.
- **Filtrar por evento**: Selecciona evento en el dropdown.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un Pull Request.

## 📧 Contacto

Para preguntas o soporte, abre un issue en GitHub.

---

## 👨‍💻 Autor

**Keletch**
- GitHub: [@keletch](https://github.com/keletch)

Hecho con ❤️ usando Next.js y Three.js