# BackOffice LaSalle

Sistema de administración BackOffice construido con una arquitectura moderna y optimizado para despliegue en la nube.

## 🏗️ Arquitectura del Sistema

### Backend (API)
- **Framework**: NestJS con TypeScript
- **Base de datos**: PostgreSQL con TypeORM
- **Autenticación**: JWT con sesión mejorada (8 horas)
- **Manejo de archivos**: Multer para uploads de Excel
- **Procesamiento de datos**: XLSX para importación/exportación

### Frontend
- **Framework**: React 19 con TypeScript
- **UI Components**: Material-UI (MUI) v7
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v7
- **Form Handling**: React Hook Form con Zod
- **Notifications**: Notistack

### Base de Datos
- **Motor**: PostgreSQL
- **ORM**: TypeORM con entidades optimizadas
- **Migraciones**: Sistema de migraciones automático
- **Seeding**: Datos iniciales configurados

## 📁 Estructura del Proyecto

```
BackOffice/
├── backoffice-api/              # API NestJS completa
│   ├── src/
│   │   ├── api.ts              # API principal desacoplada
│   │   ├── geography/          # Módulo de geografía completo
│   │   ├── catalogs/           # Catálogos del sistema
│   │   ├── database/           # Migraciones y configuración DB
│   │   └── dto/                # DTOs validados
├── backoffice-admin/            # Frontend React
│   ├── src/
│   │   ├── components/         # Componentes UI reutilizables
│   │   ├── providers/          # Context providers (Auth, etc.)
│   │   ├── api/                # Configuración HTTP
│   │   ├── utils/              # Utilidades JWT
│   │   └── pages/              # Páginas principales
├── api/                        # API para Vercel (serverless)
│   └── api.ts                  # Entry point para producción
├── vercel.json                 # Configuración optimizada para Vercel
└── package.json                # Dependencias para producción
```

## 🚀 Despliegue en Vercel

### Configuración Automática

1. **Repository**: `jnolasco-frt/catalogos-fe`
2. **Framework Preset**: Other
3. **Build Command**: `cd backoffice-admin && npm run build`
4. **Output Directory**: `backoffice-admin/dist`
5. **Functions Directory**: `api/`

### Variables de Entorno (Vercel Project Settings)

#### Base de Datos
```bash
DATABASE_URL=postgresql://user:password@host:port/db?sslmode=require
POSTGRES_URL=postgresql://user:password@host:port/db?sslmode=require
DATABASE_HOST=tu-host.vercel-storage.com
DATABASE_PORT=5432
DATABASE_USER=tu-usuario
DATABASE_PASSWORD=tu-contraseña
DATABASE_NAME=verceldb
DATABASE_SSL=true
```

#### Configuración de API
```bash
NODE_ENV=production
PORT=3000
TYPEORM_SYNCHRONIZE=false
TYPEORM_RUN_MIGRATIONS=true
TYPEORM_LOGGING=error
```

#### Autenticación
```bash
JWT_SECRET=tu-secreto-muy-seguro-aqui
JWT_EXPIRES_IN_SECONDS=28800
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=TuContraseñaSegura123!
```

## 🔧 Mejoras Implementadas

### Sistema de Autenticación Mejorado
- **Duración de sesión extendida**: 8 horas (antes 1 hora)
- **Notificaciones amigables**: Alertas sin jerga técnica
- **Refresco automático**: Tokens renovados automáticamente
- **Timeout por inactividad**: Cierre automático de sesión
- **Manejo robusto de errores**: Intercepción HTTP 401 automática

### Gestión de Geografía Completa
- **Provincias**: Gestión completa de provincias
- **Cantones**: Sistema de cantones por provincia
- **Distritos**: Distritos por cantón y provincia
- **Barrios**: Barrios por distrito
- **Importación/Exportación**: Soporte completo para Excel
- **Validaciones**: DTOs con validadores estrictos

### Optimizaciones de Rendimiento
- **TypeScript**: Compilación estricta sin errores
- **Lazy Loading**: Carga optimizada de componentes
- **Caching**: Estrategias de caché eficientes
- **Bundle Optimization**: Build optimizado para producción

## 🌐 Endpoints de API

### Endpoints Públicos
- `GET /api/health` - Health check del sistema

### Endpoints de Autenticación
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/register` - Registro de usuarios

### Endpoints de Geografía
- `GET /api/geography/provinces` - Listado de provincias
- `GET /api/geography/cantons` - Listado de cantones
- `GET /api/geography/districts` - Listado de distritos
- `GET /api/geography/barrios` - Listado de barrios
- `POST /api/geography/provinces/import` - Importación Excel
- `POST /api/geography/cantons/import` - Importación Excel
- `POST /api/geography/districts/import` - Importación Excel
- `POST /api/geography/barrios/import` - Importación Excel

### Endpoints de Catálogos
- `GET /api/catalogs` - Todos los catálogos
- `GET /api/catalogs/:type` - Catálogo específico

## 🔒 Seguridad

### JWT Implementation
- Tokens configurados con duración extendida
- Manejo seguro de expiración
- Refresco automático de tokens
- Almacenamiento seguro en localStorage

### Validaciones
- DTOs con class-validator
- Sanitización de inputs
- Protección contra inyección SQL
- CORS configurado para producción

## 🔄 Desarrollo Local

### Prerrequisitos
- Node.js 18+
- PostgreSQL 14+
- npm o yarn

### Instalación
```bash
# Clonar repositorio
git clone https://github.com/jnolasco-frt/catalogos-fe.git
cd catalogos-fe

# API Backend
cd backoffice-api
npm install
cp .env.example .env
# Editar .env con tus credenciales
npm run start:dev

# Frontend (otra terminal)
cd backoffice-admin
npm install
npm run dev
```

### Scripts Disponibles
```bash
# API
npm run start:dev        # Development
npm run build            # Build para producción
npm run test             # Ejecutar tests
npm run seed             # Seed de datos iniciales
npm run migrations:run   # Ejecutar migraciones

# Frontend
npm run dev              # Development server
npm run build            # Build para producción
npm run preview          # Preview de producción
npm run test             # Ejecutar tests
```

## 📊 Monitor y Logs

### Vercel Dashboard
- **Functions**: Monitoreo de funciones serverless
- **Builds**: Historial de builds y deployments
- **Environment**: Gestión de variables de entorno
- **Logs**: Logs en tiempo real y búsqueda avanzada

### Endpoints de Monitoreo
- `GET /api/health` - Estado general del sistema
- Logs detallados disponibles en Vercel Dashboard

## 🚨 Troubleshooting

### Problemas Comunes
1. **Build fallido**: Revisa variables de entorno en Vercel
2. **API 401**: Verifica configuración de JWT_SECRET
3. **DB Connection**: Confirma URL de base de datos con SSL
4. **404 Frontend**: Verifica configuración de routing en vercel.json

### Logs y Debugging
- Vercel Dashboard → Functions → Logs
- Browser Console para errores de frontend
- Network tab para depuración de llamadas API

## 📝 Notas de Deploy

### Configuración Específica Vercel
- Build optimizado con Vite + TypeScript
- Serverless Functions para API
- Static files serving optimizado
- CORS configurado para producción
- Headers de seguridad implementados

### URLs en Producción
- **Aplicación**: https://catalogos-fe.vercel.app
- **API**: https://catalogos-fe.vercel.app/api/*
- **Health**: https://catalogos-fe.vercel.app/api/health

## 🔄 CI/CD

### Pipeline Automático
1. **Push a main** → Build automático
2. **Tests** (si configurados)
3. **Deploy a staging/producción**
4. **Health checks** post-deploy
5. **Notificaciones** de estado del deploy

### Branch Strategy
- `main` → Producción
- `develop` → Staging (si se configura)
- Feature branches → Preview deployments

## 📄 Licencia

Copyright © Flowing Rivers Technologies. Todos los derechos reservados.