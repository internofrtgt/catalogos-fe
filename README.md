# BackOffice LaSalle

Sistema de administración BackOffice con las siguientes características:

- **API REST** construida con NestJS
- **Frontend** React con Material-UI
- **Base de datos** PostgreSQL
- **Autenticación** con JWT

## 📁 Estructura del Proyecto

```
BackOffice/
├── backoffice-api/     # API NestJS
├── backoffice-admin/   # Frontend React
└── railway.toml       # Configuración para Railway
```

## 🚀 Despliegue en Railway

1. Conecta este repositorio a Railway
2. Railway detectará automáticamente la configuración
3. Configura las variables de entorno en Railway:
   - `JWT_SECRET`: Token secreto para JWT
   - `DEFAULT_ADMIN_USERNAME`: Usuario admin inicial
   - `DEFAULT_ADMIN_PASSWORD`: Contraseña admin inicial

4. Railway provisionará automáticamente:
   - Base de datos PostgreSQL
   - Servidor para la API

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

### API (.env)
```
PORT=3000
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=backoffice
JWT_SECRET=change-me
JWT_EXPIRES_IN_SECONDS=3600
```

## 🌐 URLs en Producción

- API: `https://tu-app.railway.app`
- Frontend: Despliegue separado (Vercel/Netlify)