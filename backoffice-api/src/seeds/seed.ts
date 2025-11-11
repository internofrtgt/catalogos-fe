import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { ApiDocsService } from '../api-docs/api-docs.service';

type SwaggerSeedDoc = {
  title: string;
  version: string;
  summary: string;
  content: Record<string, unknown>;
};

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const logger = new Logger('Seeder');
  const configService = appContext.get(ConfigService);
  const usersService = appContext.get(UsersService);
  const apiDocsService = appContext.get(ApiDocsService);

  const username = configService.get<string>('DEFAULT_ADMIN_USERNAME', 'admin');
  const password = configService.get<string>('DEFAULT_ADMIN_PASSWORD', 'ChangeMe123!');

  if (!password || password.length < 8) {
    logger.error('DEFAULT_ADMIN_PASSWORD must be at least 8 characters long');
    process.exit(1);
  }

  const result = await usersService.ensureAdminUser(username, password);
  if (result.created) {
    logger.log(`Admin user "${username}" created successfully`);
  } else {
    logger.log(`Admin user "${username}" verified/updated`);
  }

  const swaggerDocs: SwaggerSeedDoc[] = [
    {
      title: 'Autenticacion API',
      version: '1.0.0',
      summary: 'Endpoints para autenticacion y gestion de sesiones.',
      content: {
        format: 'swagger-summary',
        module: {
          title: 'Autenticacion',
          description: 'Endpoints para autenticacion y gestion de sesiones.',
          baseUrl: '/api/auth',
          icon: 'lock',
        },
        endpoints: [
          {
            method: 'POST',
            path: '/api/auth/login',
            summary: 'Iniciar sesion con usuario y contrasena.',
            description:
              'Valida credenciales y devuelve un token JWT para acceder a los demas recursos protegidos.',
            authentication: 'public',
            rateLimit: '5 intentos por minuto',
            parameters: [
              {
                name: 'username',
                in: 'body',
                required: true,
                type: 'string',
                description: 'Nombre de usuario (correo o alias).',
              },
              {
                name: 'password',
                in: 'body',
                required: true,
                type: 'string',
                description: 'Contrasena del usuario (minimo 6 caracteres).',
              },
            ],
            responses: [
              {
                status: 200,
                description: 'Autenticacion exitosa.',
                body: {
                  accessToken: 'jwt-token',
                  user: {
                    id: 'uuid',
                    username: 'admin',
                    role: 'ADMIN',
                  },
                },
              },
              { status: 401, description: 'Credenciales invalidas.' },
              { status: 422, description: 'El usuario esta deshabilitado.' },
            ],
            examples: {
              curl: `curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"ChangeMe123!"}'`,
              javascript: `const response = await fetch("http://localhost:3000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "ChangeMe123!" }),
});
const data = await response.json();
console.log(data.accessToken);`,
              python: `import requests

payload = {"username": "admin", "password": "ChangeMe123!"}
response = requests.post("http://localhost:3000/api/auth/login", json=payload)
print(response.json())`,
            },
          },
          {
            method: 'GET',
            path: '/api/auth/me',
            summary: 'Consultar el perfil autenticado.',
            description:
              'Devuelve el identificador, username y rol asociados al token JWT.',
            authentication: 'bearer',
            parameters: [
              {
                name: 'Authorization',
                in: 'header',
                required: true,
                type: 'string',
                description: 'Encabezado con formato "Bearer <token>".',
              },
            ],
            responses: [
              {
                status: 200,
                description: 'Perfil del usuario autenticado.',
                body: {
                  id: 'uuid',
                  username: 'admin',
                  role: 'ADMIN',
                },
              },
              { status: 401, description: 'Token invalido o expirado.' },
            ],
            examples: {
              curl: `curl http://localhost:3000/api/auth/me \\
  -H "Authorization: Bearer <TOKEN>"`,
            },
          },
        ],
      },
    },
    {
      title: 'Usuarios API',
      version: '1.0.0',
      summary: 'CRUD completo de usuarios internos (solo administradores).',
      content: {
        format: 'swagger-summary',
        module: {
          title: 'Usuarios',
          description:
            'Creacion, edicion, listado y eliminacion de usuarios internos del backoffice.',
          baseUrl: '/api/users',
          icon: 'users',
        },
        endpoints: [
          {
            method: 'GET',
            path: '/api/users',
            summary: 'Listar usuarios con paginacion.',
            description:
              'Retorna una coleccion paginada con los usuarios registrados. Solo disponible para administradores.',
            authentication: 'bearer',
            parameters: [
              {
                name: 'page',
                in: 'query',
                required: false,
                type: 'number',
                description: 'Numero de pagina (default 1).',
              },
              {
                name: 'limit',
                in: 'query',
                required: false,
                type: 'number',
                description: 'Resultados por pagina (default 20, max 100).',
              },
              {
                name: 'search',
                in: 'query',
                required: false,
                type: 'string',
                description: 'Filtro por nombre de usuario.',
              },
            ],
          },
          {
            method: 'GET',
            path: '/api/users/{id}',
            summary: 'Obtener detalle de un usuario.',
            authentication: 'bearer',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                type: 'uuid',
                description: 'Identificador del usuario.',
              },
            ],
          },
          {
            method: 'POST',
            path: '/api/users',
            summary: 'Crear un nuevo usuario.',
            description:
              'Agrega un usuario al sistema. El nombre se almacena en minusculas y la contrasena se encripta.',
            authentication: 'bearer',
            parameters: [
              {
                name: 'username',
                in: 'body',
                required: true,
                type: 'string',
                description: 'Nombre de usuario unico.',
              },
              {
                name: 'password',
                in: 'body',
                required: true,
                type: 'string',
                description: 'Contrasena inicial.',
              },
              {
                name: 'role',
                in: 'body',
                required: false,
                type: 'enum',
                description: 'ADMIN u OPERATOR (default OPERATOR).',
              },
            ],
            responses: [
              { status: 201, description: 'Usuario creado.' },
              { status: 409, description: 'El username ya esta en uso.' },
            ],
            examples: {
              curl: `curl -X POST http://localhost:3000/api/users \\
  -H "Authorization: Bearer <TOKEN_ADMIN>" \\
  -H "Content-Type: application/json" \\
  -d '{"username":"operador1","password":"Secreto123","role":"OPERATOR"}'`,
            },
          },
          {
            method: 'PUT',
            path: '/api/users/{id}',
            summary: 'Actualizar un usuario existente.',
            authentication: 'bearer',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                type: 'uuid',
                description: 'Identificador del usuario.',
              },
            ],
          },
          {
            method: 'DELETE',
            path: '/api/users/{id}',
            summary: 'Eliminar un usuario.',
            description:
              'Remueve definitivamente el usuario indicado. No permite auto-eliminacion.',
            authentication: 'bearer',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                type: 'uuid',
                description: 'Identificador del usuario.',
              },
            ],
            responses: [
              { status: 200, description: 'Usuario eliminado.' },
              { status: 400, description: 'Intento de eliminar el propio usuario.' },
            ],
            examples: {
              python: `import requests

requests.delete(
  "http://localhost:3000/api/users/<USER_ID>",
  headers={"Authorization": f"Bearer {token}"}
)`,
            },
          },
        ],
      },
    },
    {
      title: 'Catalogos API',
      version: '1.0.0',
      summary: 'Consulta, edicion e importacion de catalogos maestros.',
      content: {
        format: 'swagger-summary',
        module: {
          title: 'Catalogos',
          description:
            'Permite consultar y administrar los catalogos maestros utilizados por el sistema.',
          baseUrl: '/api/catalogs',
          icon: 'list',
        },
        endpoints: [
          {
            method: 'GET',
            path: '/api/catalogs',
            summary: 'Listar catalogos disponibles.',
            authentication: 'bearer',
          },
          {
            method: 'GET',
            path: '/api/catalogs/{catalogKey}',
            summary: 'Obtener registros de un catalogo.',
            authentication: 'bearer',
            parameters: [
              {
                name: 'catalogKey',
                in: 'path',
                required: true,
                type: 'string',
                description: 'Clave del catalogo (ej. tipos-documento).',
              },
              { name: 'page', in: 'query', required: false, type: 'number' },
              { name: 'limit', in: 'query', required: false, type: 'number' },
              { name: 'search', in: 'query', required: false, type: 'string' },
            ],
          },
          {
            method: 'POST',
            path: '/api/catalogs/{catalogKey}',
            summary: 'Crear registro en un catalogo.',
            authentication: 'bearer',
          },
          {
            method: 'PUT',
            path: '/api/catalogs/{catalogKey}/{id}',
            summary: 'Actualizar registro en un catalogo.',
            authentication: 'bearer',
          },
          {
            method: 'DELETE',
            path: '/api/catalogs/{catalogKey}/{id}',
            summary: 'Eliminar registro de un catalogo.',
            authentication: 'bearer',
          },
          {
            method: 'POST',
            path: '/api/catalogs/{catalogKey}/import',
            summary: 'Importar registros desde Excel.',
            description:
              'Acepta archivos .xlsx de hasta 5MB. El modo "append" agrega registros; "replace" limpia antes de importar.',
            authentication: 'bearer',
            parameters: [
              {
                name: 'catalogKey',
                in: 'path',
                required: true,
                type: 'string',
              },
              {
                name: 'file',
                in: 'formData',
                required: true,
                type: 'file',
                description: 'Archivo Excel segun plantilla oficial.',
              },
              {
                name: 'mode',
                in: 'query',
                required: false,
                type: 'enum',
                description: 'Valores permitidos: append (default) o replace.',
              },
            ],
            examples: {
              curl: `curl -X POST http://localhost:3000/api/catalogs/tipos-documento/import \\
  -H "Authorization: Bearer <TOKEN_ADMIN>" \\
  -F "mode=replace" \\
  -F "file=@/ruta/catalogo.xlsx"`,
            },
          },
        ],
      },
    },
    {
      title: 'Geografia API',
      version: '1.0.0',
      summary:
        'Administracion de provincias, cantones, distritos y barrios (incluye importacion masiva).',
      content: {
        format: 'swagger-summary',
        module: {
          title: 'Geografia',
          description:
            'Endpoints para gestionar ubicaciones geograficas jerarquicas utilizadas en los procesos del sistema.',
          baseUrl: '/api/geography',
          icon: 'map',
        },
        endpoints: [
          {
            method: 'GET',
            path: '/api/geography/provinces',
            summary: 'Listar provincias.',
            authentication: 'bearer',
            parameters: [
              { name: 'search', in: 'query', required: false, type: 'string' },
            ],
          },
          {
            method: 'POST',
            path: '/api/geography/provinces',
            summary: 'Crear provincia.',
            authentication: 'bearer',
            parameters: [
              { name: 'nombre', in: 'body', required: true, type: 'string' },
              { name: 'codigo', in: 'body', required: true, type: 'number' },
            ],
          },
          {
            method: 'POST',
            path: '/api/geography/provinces/import',
            summary: 'Importar provincias desde Excel.',
            authentication: 'bearer',
            parameters: [
              { name: 'file', in: 'formData', required: true, type: 'file' },
              { name: 'mode', in: 'query', required: false, type: 'enum' },
            ],
          },
          {
            method: 'GET',
            path: '/api/geography/cantons',
            summary: 'Listar cantones.',
            authentication: 'bearer',
            parameters: [
              { name: 'provinceCode', in: 'query', required: false, type: 'number' },
              { name: 'search', in: 'query', required: false, type: 'string' },
            ],
          },
          {
            method: 'POST',
            path: '/api/geography/cantons/import',
            summary: 'Importar cantones desde Excel.',
            authentication: 'bearer',
          },
          {
            method: 'GET',
            path: '/api/geography/districts',
            summary: 'Listar distritos.',
            authentication: 'bearer',
            parameters: [
              { name: 'provinceCode', in: 'query', required: false, type: 'number' },
              { name: 'cantonCode', in: 'query', required: false, type: 'number' },
            ],
          },
          {
            method: 'POST',
            path: '/api/geography/districts/import',
            summary: 'Importar distritos desde Excel.',
            authentication: 'bearer',
          },
          {
            method: 'GET',
            path: '/api/geography/barrios',
            summary: 'Listar barrios.',
            authentication: 'bearer',
            parameters: [
              { name: 'provinceCode', in: 'query', required: false, type: 'number' },
              { name: 'cantonCode', in: 'query', required: false, type: 'number' },
              { name: 'districtName', in: 'query', required: false, type: 'string' },
            ],
          },
          {
            method: 'POST',
            path: '/api/geography/barrios/import',
            summary: 'Importar barrios desde Excel.',
            authentication: 'bearer',
          },
        ],
      },
    },
    {
      title: 'Documentacion API',
      version: '1.0.0',
      summary: 'CRUD de documentos tecnicos visibles en el portal de administracion.',
      content: {
        format: 'swagger-summary',
        module: {
          title: 'Documentacion',
          description:
            'Gestiona la documentacion interna de APIs expuesta en el portal de administracion.',
          baseUrl: '/api/api-docs',
          icon: 'book',
        },
        endpoints: [
          {
            method: 'GET',
            path: '/api/api-docs',
            summary: 'Listar documentos.',
            authentication: 'bearer',
            parameters: [
              { name: 'page', in: 'query', required: false, type: 'number' },
              { name: 'limit', in: 'query', required: false, type: 'number' },
              { name: 'search', in: 'query', required: false, type: 'string' },
            ],
          },
          {
            method: 'GET',
            path: '/api/api-docs/{id}',
            summary: 'Obtener detalle de un documento.',
            authentication: 'bearer',
            parameters: [
              { name: 'id', in: 'path', required: true, type: 'uuid' },
            ],
          },
          {
            method: 'POST',
            path: '/api/api-docs',
            summary: 'Crear documento (ADMIN).',
            authentication: 'bearer',
            parameters: [
              { name: 'title', in: 'body', required: true, type: 'string' },
              { name: 'version', in: 'body', required: true, type: 'string' },
              { name: 'summary', in: 'body', required: true, type: 'string' },
              { name: 'content', in: 'body', required: true, type: 'string' },
            ],
            examples: {
              javascript: `await fetch("http://localhost:3000/api/api-docs", {
  method: "POST",
  headers: {
    "Authorization": "Bearer " + adminToken,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    title: "API Facturacion",
    version: "1.0.0",
    summary: "Lineamientos para facturacion electronica",
    content: "# Introduccion\\nDetalles..."
  })
});`,
            },
          },
          {
            method: 'PUT',
            path: '/api/api-docs/{id}',
            summary: 'Actualizar documento (ADMIN).',
            authentication: 'bearer',
          },
          {
            method: 'DELETE',
            path: '/api/api-docs/{id}',
            summary: 'Eliminar documento (ADMIN).',
            authentication: 'bearer',
          },
        ],
      },
    },
  ];

  for (const doc of swaggerDocs) {
    const payload = {
      title: doc.title,
      version: doc.version,
      summary: doc.summary,
      content: JSON.stringify(doc.content, null, 2),
    };

    const existing = await apiDocsService.findAll({
      page: 1,
      limit: 50,
      search: doc.title,
    });
    const match = existing.data.find(
      (entry) => entry.title === doc.title && entry.version === doc.version,
    );

    if (match) {
      await apiDocsService.update(match.id, payload);
      logger.log(`API doc "${doc.title}" updated`);
    } else {
      await apiDocsService.create(payload);
      logger.log(`API doc "${doc.title}" created`);
    }
  }

  await appContext.close();
}

bootstrap()
  .then(() => process.exit(0))
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Seed execution failed', error);
    process.exit(1);
  });
