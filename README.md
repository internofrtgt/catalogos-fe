# BackOffice LaSalle

Sistema de administración BackOffice con las siguientes características:

- **API REST** construida con NestJS
- **Frontend** React con Material-UI
- **Base de datos** PostgreSQL
- **Autenticación** con JWT
- **Despliegue** optimizado para Vercel

## 📁 Estructura del Proyecto

```
BackOffice/
├── backoffice-api/         # API NestJS
├── backoffice-admin/       # Frontend React
├── vercel.json            # Configuración para Vercel
└── .env.vercel.example    # Variables de entorno para Vercel
```

## 🚀 Despliegue en Vercel

### 1. Despliegue Automático (Recomendado)

1. Conecta este repositorio a [Vercel](https://vercel.com)
2. Importa el repositorio: `jnolasco-frt/catalogos-fe`
3. Vercel detectará automáticamente `vercel.json`
4. Configura las variables de entorno (ver sección Variables de Entorno)

### 2. Configuración Manual

Si la detección automática no funciona:

1. **Framework Preset:** Other
2. **Root Directory:** ./
3. **Build Command:** `npm install && npm run build`
4. **Output Directory:** `backoffice-admin/dist`

## 🔧 Desarrollo Local

### API
```bash
cd backoffice-api
npm install
cp .env.example .env
npm run start:dev
```

### Frontend
```bash
cd backoffice-admin
npm install
npm run dev
```

## 📦 Variables de Entorno

### Para Vercel (Configurar en Project Settings)

Copia las variables desde `.env.vercel.example`:

#### Database (Vercel Postgres)
- `DATABASE_URL` - URL completa de conexión
- `POSTGRES_URL` - URL PostgreSQL
- `DATABASE_HOST` - Host de la base de datos
- `DATABASE_USER` - Usuario de la base de datos
- `DATABASE_PASSWORD` - Contraseña de la base de datos
- `DATABASE_NAME` - Nombre de la base de datos

#### API Configuration
- `NODE_ENV=production`
- `PORT=3000`
- `TYPEORM_SYNCHRONIZE=false`
- `TYPEORM_RUN_MIGRATIONS=true`
- `TYPEORM_LOGGING=error`

#### Authentication
- `JWT_SECRET` - Token secreto para JWT (usa uno fuerte)
- `JWT_EXPIRES_IN_SECONDS=3600`
- `DEFAULT_ADMIN_USERNAME` - Usuario admin inicial
- `DEFAULT_ADMIN_PASSWORD` - Contraseña admin inicial

### Para Desarrollo Local
```bash
cd backoffice-api
cp .env.example .env
# Editar .env con tus credenciales locales
```

## 🌐 URLs en Producción

- **Aplicación completa:** `https://tu-app.vercel.app`
- **API endpoints:** `https://tu-app.vercel.app/api/*`
- **Frontend:** Rutas raíz del dominio

## 🔄 Despliegue Continuo

Cada vez que hagas push a `main`, Vercel automáticamente:
1. 🔨 Build del proyecto
2. 🧪 Ejecuta tests (si configuraste)
3. 🚀 Despliega la nueva versión
4. 📊 Actualiza las URLs de producción

## 🐛 Troubleshooting

### Common Issues
1. **Database connection:** Verifica que `DATABASE_URL` tenga SSL
2. **Build fails:** Revisa que todas las dependencias estén en `package.json`
3. **API not working:** Configura correctamente las variables de entorno

### Logs
- Revisa los logs en Vercel Dashboard → Functions → Logs
- Para debugging local: `npm run start:dev`