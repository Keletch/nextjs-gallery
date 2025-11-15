# nextJs_InfiniteGallery

Galería interactiva de fotos de eventos con sistema de moderación, animaciones 3D con Three.js y gestión de imágenes mediante Supabase Storage.

## 🚀 Características

- **Galería 3D flotante** con imágenes animadas usando Three.js y React Three Fiber
- **Sistema de moderación** completo con autenticación de Google
- **Subida de imágenes** con compresión automática y generación de thumbnails
- **Vista en cuadrícula** alternativa para navegación rápida
- **Múltiples eventos** con filtrado y selección dinámica
- **Compartir en redes sociales** con Open Graph metadata dinámico
- **Rate limiting** para prevenir spam
- **Optimizaciones de rendimiento** con lazy loading y limits de imágenes activas
- **Modo de pausa** cuando cambias de pestaña para ahorrar recursos

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
3. Configura las políticas de acceso:

```sql
-- Política para lectura pública
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'nextjsGallery');

-- Política para subida autenticada (opcional, puedes permitir subidas públicas)
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'nextjsGallery');

-- Política para actualización/eliminación solo con service role
-- (esto se maneja desde el backend con SUPABASE_SERVICE_ROLE_KEY)
```

### 4. Estructura de carpetas en Storage

El sistema crea automáticamente esta estructura:
```
nextjsGallery/
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
4. Agrega los moderadores a la tabla `moderators`:

```sql
INSERT INTO moderators (email) VALUES ('tu-email@gmail.com');
```

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
│   │   ├── approved/     # Aprobar imágenes
│   │   ├── reject/       # Rechazar imágenes
│   │   └── ...
│   ├── gallery/          # Galería principal (3D)
│   ├── moderate/         # Panel de moderación
│   ├── upload/           # Formulario de subida
│   └── layout.tsx        # Layout raíz
├── lib/
│   ├── supabase.ts       # Cliente de Supabase (server)
│   ├── supabase-client.ts # Cliente de Supabase (browser)
│   ├── auth-check.ts     # Verificación de moderadores
│   └── rate-limit.ts     # Rate limiting
├── public/               # Archivos estáticos
└── next.config.ts        # Configuración de Next.js
```

## 🔒 Seguridad

El proyecto implementa múltiples capas de seguridad:

- **Rate limiting** por IP (5 uploads/minuto por defecto)
- **Validación de archivos** con Sharp (solo imágenes reales)
- **Autenticación de moderadores** vía Google OAuth + whitelist
- **Headers de seguridad** (XSS Protection, Frame Options, CSP)
- **Honeypot** anti-bots en formularios
- **Service Role Key** solo en servidor (nunca expuesta al cliente)

### Ajustar Rate Limiting

En `app/api/upload/route.ts`, modifica estos valores:

```typescript
if (!checkRateLimit(ip, 10, 60000)) { // 10 uploads por 60 segundos
  return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })
}
```

## 🎨 Personalización

### Colores de eventos

Edita `app/gallery/BackgroundCanvas.tsx`:

```typescript
const EVENT_COLORS = {
  'nombre-evento': {
    subColor: [0.28, 0.07, 0.38],  // RGB normalizado
    accentColor: [0.0, 0.0, 0.0],
  },
  // ...
}
```

### Límite de imágenes flotantes

En `app/gallery/GalleryCanvas.tsx`:

```typescript
if (prev.length >= 18 || baul.current.length === 0) { // Cambiar 18 por otro número
```

### Tamaño máximo de archivos

En `app/api/upload/route.ts`:

```typescript
const MAX_SIZE_MB = 50 // Cambiar según necesites
```

> **Nota**: Vercel tiene un límite de 4.5MB para el body de requests en funciones serverless. Las imágenes se comprimen en el cliente antes de subir.

## 🚀 Deploy en Vercel

1. **Push a GitHub**
```bash
git push origin main
```

2. **Importar en Vercel**
   - Ve a [vercel.com](https://vercel.com)
   - Importa tu repositorio
   - Agrega las variables de entorno (.env.local)

3. **Configurar dominio** (opcional)
   - Ve a Settings > Domains en tu proyecto de Vercel
   - Agrega tu dominio personalizado

## 📝 Uso

### Para usuarios (subir fotos)

1. Ve a `/upload`
2. Selecciona el evento
3. Arrastra o selecciona una imagen
4. Agrega una descripción
5. Sube la imagen (quedará pendiente de moderación)

### Para moderadores

1. Inicia sesión con Google en `/moderate`
2. Selecciona el evento a moderar
3. Revisa imágenes pendientes
4. Aprueba o rechaza cada imagen
5. Las aprobadas aparecen automáticamente en la galería

### Ver galería

- **Modo 3D**: Vista por defecto con imágenes flotantes animadas
- **Modo Grid**: Click en el botón de cuadrícula para ver todas las imágenes en una grilla
- **Filtrar por evento**: Selecciona evento en el dropdown
- **Compartir**: Click en una imagen para ver opciones de compartir

## 🐛 Troubleshooting

### Las imágenes no cargan

- Verifica que el bucket de Supabase sea público
- Revisa las políticas de Storage
- Confirma que la URL del bucket sea correcta en las variables de entorno

### Error de autenticación en moderación

- Asegúrate de que tu email esté en la tabla `moderators`
- Verifica que Google OAuth esté configurado correctamente en Supabase

### Imágenes grandes no se suben

- El límite de Vercel es 4.5MB por request
- Las imágenes se comprimen automáticamente en el cliente
- Si persiste, reduce `MAX_SIZE_MB` o mejora la compresión del cliente

### Parpadeo en galería 3D

- Esto puede ocurrir si hay muchas imágenes
- El sistema limita a 18 imágenes flotantes simultáneas
- Las imágenes se cargan gradualmente cada 2 segundos

## 📄 Licencia

MIT License - siéntete libre de usar este proyecto para tus propios eventos.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📧 Contacto

Para preguntas o soporte, abre un issue en GitHub.

---

## 👨‍💻 Autor

**Keletch**
- GitHub: [@keletch](https://github.com/keletch)

Hecho con ❤️ usando Next.js y Three.js