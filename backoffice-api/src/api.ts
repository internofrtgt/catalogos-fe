import express from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import xlsx from 'xlsx';

const app = express();
app.use(express.json());

// Setup multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel files
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed (.xlsx, .xls)'));
    }
  }
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Define JWT payload interface
interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

// Test database connection
pool.query('SELECT NOW()')
  .then(() => console.log('Database connected successfully'))
  .catch(err => console.error('Database connection error:', err.message));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is working', timestamp: new Date().toISOString() });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Find user in database
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        sub: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      accessToken: token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Current user endpoint
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token required' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Get user from database
    const result = await pool.query(
      'SELECT id, username, role FROM users WHERE id = $1 AND is_active = true',
      [decoded.sub]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      username: user.username,
      role: user.role
    });

  } catch (error) {
    console.error('Me endpoint error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Create users table if it doesn't exist
app.post('/api/setup/table', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(120) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'OPERATOR',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    res.json({ message: 'Users table created successfully' });

  } catch (error) {
    console.error('Table creation error:', error);
    res.status(500).json({ message: 'Error creating users table', error: error.message });
  }
});

// Create admin user endpoint
app.post('/api/setup/admin', async (req, res) => {
  try {
    const username = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMe123!';

    // Check if admin already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.json({
        message: 'Admin user already exists',
        user: { username }
      });
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (username, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [username.toLowerCase(), hashedPassword, 'ADMIN', true]
    );

    res.json({
      message: 'Admin user created successfully',
      user: { username, role: 'ADMIN' }
    });

  } catch (error) {
    console.error('Admin creation error:', error);
    res.status(500).json({ message: 'Error creating admin user' });
  }
});

// Middleware to verify JWT token
function authenticateToken(req: express.Request & { user?: JwtPayload }, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token required' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Middleware to check admin role
function requireAdmin(req: express.Request & { user?: JwtPayload }, res: express.Response, next: express.NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin role required' });
  }
  next();
}

// Complete catalog definitions with correct field types
const catalogDefinitions: any[] = [
  {
    key: 'tipos-documento',
    label: 'Tipos de Documentos',
    tableName: 'tipos_documento',
    fields: [
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'string', required: true, length: 50 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'situaciones-presentacion',
    label: 'Situación de Presentación',
    tableName: 'situaciones_presentacion',
    fields: [
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'int', required: true },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'actividades-economicas',
    label: 'Actividades Económicas',
    tableName: 'actividades_economicas',
    fields: [
      { name: 'codigo', type: 'string', required: true, length: 255 },
      { name: 'nombre', type: 'string', required: true, length: 1024 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['nombre', 'codigo'],
  },
  {
    key: 'condiciones-venta',
    label: 'Condiciones de Venta',
    tableName: 'condiciones_venta',
    fields: [
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'string', required: true, length: 50 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-identificacion',
    label: 'Tipos de Identificación',
    tableName: 'tipos_identificacion',
    fields: [
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'string', required: true, length: 50 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'formas-farmaceuticas',
    label: 'Formas Farmacéuticas',
    tableName: 'formas_farmaceuticas',
    fields: [
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'int', required: true },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-codigo-ps',
    label: 'Tipos de Código para Producto o Servicio',
    tableName: 'tipos_codigo_ps',
    fields: [
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'string', required: true, length: 50 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'unidades-medida',
    label: 'Unidades de Medida',
    tableName: 'unidades_medida',
    fields: [
      {
        name: 'unidad',
        type: 'string',
        required: true,
        length: 1024,
      },
      {
        name: 'simbolo',
        type: 'string',
        required: true,
        length: 1024,
      },
      {
        name: 'tipoUnidad',
        type: 'string',
        required: true,
        length: 1024,
      },
    ],
    uniqueBy: ['unidad'],
    searchFields: ['unidad', 'simbolo', 'tipoUnidad'],
  },
  {
    key: 'tipos-transaccion',
    label: 'Tipos de Transacción',
    tableName: 'tipos_transaccion',
    fields: [
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'string', required: true, length: 50 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-descuento',
    label: 'Tipos de Descuento',
    tableName: 'tipos_descuento',
    fields: [
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'string', required: true, length: 50 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-impuestos',
    label: 'Tipos de Impuestos',
    tableName: 'tipos_impuestos',
    fields: [
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'string', required: true, length: 50 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tarifas-iva',
    label: 'Tarifas de IVA',
    tableName: 'tarifas_iva',
    fields: [
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'string', required: true, length: 50 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-documento-exoneracion',
    label: 'Tipos de Documento de Exoneración',
    tableName: 'tipos_documento_exoneracion',
    fields: [
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'string', required: true, length: 50 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'instituciones-exoneracion',
    label: 'Instituciones o Dep. Emisoras de Exoneración',
    tableName: 'instituciones_exoneracion',
    fields: [
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'string', required: true, length: 50 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-otros-cargos',
    label: 'Tipos de Otros Cargos',
    tableName: 'tipos_otros_cargos',
    fields: [
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'string', required: true, length: 50 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'codigos-moneda',
    label: 'Códigos de Moneda',
    tableName: 'codigos_moneda',
    fields: [
      { name: 'pais', type: 'string', required: true, length: 1024 },
      { name: 'moneda', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'string', required: true, length: 3 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['pais', 'moneda', 'codigo'],
  },
  {
    key: 'medios-pago',
    label: 'Medios de Pago',
    tableName: 'medios_pago',
    fields: [
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'string', required: true, length: 50 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-documento-referencia',
    label: 'Tipos de Documento de Referencia',
    tableName: 'tipos_documento_referencia',
    fields: [
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'string', required: true, length: 50 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'codigos-referencia',
    label: 'Códigos de Referencia',
    tableName: 'codigos_referencia',
    fields: [
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'string', required: true, length: 50 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'mensajes-recepcion',
    label: 'Mensajes de Recepción',
    tableName: 'mensajes_recepcion',
    fields: [
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'int', required: true },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'condiciones-impuesto',
    label: 'Condiciones de Impuesto',
    tableName: 'condiciones_impuesto',
    fields: [
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'string', required: true, length: 50 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
];

const catalogDefinitionsMap = new Map(
  catalogDefinitions.map((def) => [def.key, def]),
);

// Helper function to transform database column names to camelCase
function toCamelCase(str: string): string {
  // Handle snake_case: tipo_unidad -> tipoUnidad
  if (str.includes('_')) {
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  // Handle specific known cases: tipounidad -> tipoUnidad
  const knownCases: { [key: string]: string } = {
    'tipounidad': 'tipoUnidad',
    'tipocodigo': 'tipoCodigo',
    'codigomoneda': 'codigoMoneda',
    'codigopais': 'codigoPais',
    'codigo_provincia': 'codigoProvincia',
    'codigo_canton': 'codigoCanton',
    'codigo_distrito': 'codigoDistrito',
    'codigo_barrio': 'codigoBarrio',
    // Add more as needed
  };

  if (knownCases[str]) {
    return knownCases[str];
  }

  // Handle camelCase with first letter lowercase (already correct)
  if (/^[a-z][a-zA-Z]*$/.test(str)) {
    return str;
  }

  // Handle lowercase words: add camelCase transitions for common words
  const words = ['tipo', 'codigo', 'nombre', 'descripcion', 'unidad', 'simbolo'];
  let result = str;

  for (const word of words) {
    if (result.includes(word) && result.indexOf(word) > 0) {
      const index = result.indexOf(word);
      result = result.substring(0, index) +
                word.charAt(0).toUpperCase() +
                word.substring(1);
    }
  }

  return result;
}

// Helper function to transform database row object keys to camelCase
function transformRowKeys(row: any): any {
  const transformed: any = {};
  for (const key in row) {
    transformed[toCamelCase(key)] = row[key];
  }
  return transformed;
}

// Helper function to create catalog tables
async function createCatalogTable(definition: any) {
  const columns: string[] = [
    'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
    'created_at TIMESTAMPTZ DEFAULT NOW()',
    'updated_at TIMESTAMPTZ DEFAULT NOW()',
  ];

  definition.fields.forEach((field: any) => {
    let columnDef = '';
    if (field.type === 'string') {
      columnDef = `${field.name} VARCHAR(${field.length || 1024})`;
    } else if (field.type === 'int') {
      columnDef = `${field.name} INTEGER`;
    } else if (field.type === 'numeric') {
      columnDef = `${field.name} NUMERIC(${field.precision || 12}, ${field.scale || 4})`;
    }

    if (field.required) {
      columnDef += ' NOT NULL';
    }

    columns.push(columnDef);
  });

  const uniqueConstraint = definition.uniqueBy.length > 0
    ? `, UNIQUE (${definition.uniqueBy.join(', ')})`
    : '';

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS ${definition.tableName} (
      ${columns.join(', ')}
      ${uniqueConstraint}
    )
  `;

  try {
    await pool.query(createTableSQL);
    console.log(`Table ${definition.tableName} created successfully`);
  } catch (error) {
    console.error(`Error creating table ${definition.tableName}:`, error);
  }
}

// Initialize catalog tables
async function initializeCatalogTables() {
  for (const definition of catalogDefinitions) {
    await createCatalogTable(definition);
  }
}

// Initialize geography tables
async function initializeGeographyTables() {
  try {
    // Create provinces table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS provincias (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(120) NOT NULL,
        codigo INTEGER NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('Table provincias created successfully');

    // Create cantones table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cantones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provincia_nombre VARCHAR(120) NOT NULL,
        province_code INTEGER NOT NULL,
        nombre VARCHAR(120) NOT NULL,
        codigo INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (province_code, codigo)
      )
    `);
    console.log('Table cantones created successfully');

    // Create distritos table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS distritos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provincia_nombre VARCHAR(120) NOT NULL,
        province_code INTEGER NOT NULL,
        canton_nombre VARCHAR(120) NOT NULL,
        canton_code INTEGER NOT NULL,
        nombre VARCHAR(120) NOT NULL,
        codigo INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (province_code, canton_code, codigo)
      )
    `);
    console.log('Table distritos created successfully');

    // Create barrios table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS barrios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        province_key VARCHAR(80) NOT NULL,
        provincia_nombre VARCHAR(120) NOT NULL,
        province_code INTEGER NOT NULL,
        canton_nombre VARCHAR(120) NOT NULL,
        canton_code INTEGER NOT NULL,
        district_name VARCHAR(120) NOT NULL,
        district_code INTEGER,
        nombre VARCHAR(120) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (province_code, canton_code, district_name, nombre)
      )
    `);
    console.log('Table barrios created successfully');
  } catch (error) {
    console.error('Error creating geography tables:', error);
  }
}

// Initialize all tables on startup
async function initializeAllTables() {
  await initializeCatalogTables();
  await initializeGeographyTables();
  await initializeApiDocsTable();
  await seedApiDocumentation();
}

// Initialize api_documents table
async function initializeApiDocsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(160) NOT NULL,
        version VARCHAR(32) NOT NULL,
        summary VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (title, version)
      )
    `);
    console.log('Table api_documents created successfully');
  } catch (error) {
    console.error('Error creating api_documents table:', error);
  }
}

// Seed API documentation automatically on startup
async function seedApiDocumentation() {
  try {
    // Check if documentation already exists
    const existingDocs = await pool.query('SELECT COUNT(*) as count FROM api_documents');
    if (parseInt(existingDocs.rows[0].count) > 0) {
      console.log('API documentation already exists, skipping seed');
      return;
    }

    const documentation = [
      {
        title: 'Autenticación',
        version: 'v1.0.0',
        summary: 'Endpoints de autenticación y autorización',
        content: JSON.stringify({
          format: 'swagger-summary',
          module: {
            title: 'Autenticación',
            description: 'Sistema de autenticación de usuarios y gestión de sesiones JWT',
            baseUrl: '/api/auth',
            icon: 'lock'
          },
          endpoints: [
            {
              method: 'POST',
              path: '/api/auth/login',
              summary: 'Autenticar usuario',
              description: 'Inicia sesión de usuario y retorna token JWT',
              authentication: 'public',
              parameters: [
                { name: 'username', in: 'body', required: true, type: 'string', description: 'Nombre de usuario' },
                { name: 'password', in: 'body', required: true, type: 'string', description: 'Contraseña del usuario' }
              ],
              responses: [
                {
                  status: 200,
                  description: 'Autenticación exitosa',
                  body: {
                    accessToken: 'jwt_token_string',
                    user: {
                      id: 'uuid',
                      username: 'admin',
                      role: 'ADMIN'
                    }
                  }
                }
              ]
            },
            {
              method: 'GET',
              path: '/api/auth/me',
              summary: 'Obtener usuario actual',
              description: 'Obtiene información del usuario autenticado',
              authentication: 'bearer',
              responses: [
                {
                  status: 200,
                  description: 'Información del usuario',
                  body: {
                    id: 'uuid',
                    username: 'admin',
                    role: 'ADMIN'
                  }
                }
              ]
            }
          ]
        })
      },
      {
        title: 'Catálogos',
        version: 'v1.0.0',
        summary: 'Operaciones CRUD para catálogos tributarios',
        content: JSON.stringify({
          format: 'swagger-summary',
          module: {
            title: 'Catálogos Tributarios',
            description: '21 catálogos tributarios del sistema fiscal costarricense',
            baseUrl: '/api/catalogs',
            icon: 'list'
          },
          endpoints: [
            {
              method: 'GET',
              path: '/api/catalogs',
              summary: 'Listar todos los catálogos',
              description: 'Retorna la lista de todos los catálogos disponibles con sus definiciones',
              authentication: 'bearer',
              responses: [
                {
                  status: 200,
                  description: 'Lista de catálogos',
                  body: [
                    {
                      key: 'tipos-documento',
                      label: 'Tipos de Documentos',
                      tableName: 'tipos_documento',
                      fields: [
                        { name: 'descripcion', type: 'string', required: true, length: 1024 },
                        { name: 'codigo', type: 'int', required: true }
                      ],
                      uniqueBy: ['codigo'],
                      searchFields: ['descripcion', 'codigo']
                    }
                  ]
                }
              ]
            },
            {
              method: 'GET',
              path: '/api/catalogs/{catalogKey}',
              summary: 'Obtener items de catálogo',
              description: 'Obtiene items paginados de un catálogo específico con búsqueda opcional',
              authentication: 'bearer',
              parameters: [
                { name: 'catalogKey', in: 'path', required: true, type: 'string', description: 'Clave del catálogo' },
                { name: 'search', in: 'query', required: false, type: 'string', description: 'Término de búsqueda' },
                { name: 'page', in: 'query', required: false, type: 'number', description: 'Número de página' },
                { name: 'limit', in: 'query', required: false, type: 'number', description: 'Items por página' }
              ],
              responses: [
                {
                  status: 200,
                  description: 'Items del catálogo',
                  body: {
                    data: [
                      {
                        id: 'uuid',
                        descripcion: 'Cédula Física',
                        codigo: 1,
                        created_at: '2025-01-01T00:00:00Z',
                        updated_at: '2025-01-01T00:00:00Z'
                      }
                    ],
                    meta: {
                      total: 50,
                      page: 1,
                      limit: 50
                    }
                  }
                }
              ]
            },
            {
              method: 'POST',
              path: '/api/catalogs/{catalogKey}',
              summary: 'Crear item de catálogo',
              description: 'Crea un nuevo item en el catálogo especificado (solo administradores)',
              authentication: 'bearer',
              parameters: [
                { name: 'catalogKey', in: 'path', required: true, type: 'string', description: 'Clave del catálogo' }
              ]
            },
            {
              method: 'PUT',
              path: '/api/catalogs/{catalogKey}/{id}',
              summary: 'Actualizar item de catálogo',
              description: 'Actualiza un item existente en el catálogo (solo administradores)',
              authentication: 'bearer',
              parameters: [
                { name: 'catalogKey', in: 'path', required: true, type: 'string', description: 'Clave del catálogo' },
                { name: 'id', in: 'path', required: true, type: 'string', description: 'ID del item' }
              ]
            },
            {
              method: 'DELETE',
              path: '/api/catalogs/{catalogKey}/{id}',
              summary: 'Eliminar item de catálogo',
              description: 'Elimina un item del catálogo (solo administradores)',
              authentication: 'bearer',
              parameters: [
                { name: 'catalogKey', in: 'path', required: true, type: 'string', description: 'Clave del catálogo' },
                { name: 'id', in: 'path', required: true, type: 'string', description: 'ID del item' }
              ]
            }
          ]
        })
      },
      {
        title: 'Geografía',
        version: 'v1.0.0',
        summary: 'Datos geográficos de Costa Rica - provincias, cantones, distritos, barrios',
        content: JSON.stringify({
          format: 'swagger-summary',
          module: {
            title: 'Geografía de Costa Rica',
            description: 'Sistema completo de datos geográficos: provincias, cantones, distritos y barrios',
            baseUrl: '/api/geography',
            icon: 'map'
          },
          endpoints: [
            {
              method: 'GET',
              path: '/api/geography/provinces',
              summary: 'Listar provincias',
              description: 'Obtiene todas las provincias de Costa Rica con paginación y búsqueda',
              authentication: 'bearer',
              parameters: [
                { name: 'search', in: 'query', required: false, type: 'string', description: 'Término de búsqueda' },
                { name: 'page', in: 'query', required: false, type: 'number', description: 'Número de página' },
                { name: 'limit', in: 'query', required: false, type: 'number', description: 'Items por página' }
              ],
              responses: [
                {
                  status: 200,
                  description: 'Lista de provincias',
                  body: {
                    data: [
                      {
                        id: 'uuid',
                        nombre: 'San José',
                        codigo: 1,
                        created_at: '2025-01-01T00:00:00Z',
                        updated_at: '2025-01-01T00:00:00Z'
                      }
                    ],
                    meta: {
                      total: 7,
                      page: 1,
                      limit: 50
                    }
                  }
                }
              ]
            },
            {
              method: 'GET',
              path: '/api/geography/cantons',
              summary: 'Listar cantones',
              description: 'Obtiene todos los cantones con filtros opcionales',
              authentication: 'bearer',
              parameters: [
                { name: 'search', in: 'query', required: false, type: 'string', description: 'Término de búsqueda' },
                { name: 'provinceCode', in: 'query', required: false, type: 'number', description: 'Código de provincia' },
                { name: 'page', in: 'query', required: false, type: 'number', description: 'Número de página' },
                { name: 'limit', in: 'query', required: false, type: 'number', description: 'Items por página' }
              ]
            },
            {
              method: 'GET',
              path: '/api/geography/provinces/{provinceCode}/cantons',
              summary: 'Cantones por provincia',
              description: 'Obtiene cantones para una provincia específica',
              authentication: 'bearer',
              parameters: [
                { name: 'provinceCode', in: 'path', required: true, type: 'number', description: 'Código de provincia' }
              ]
            },
            {
              method: 'POST',
              path: '/api/geography/seed',
              summary: 'Inicializar datos geográficos',
              description: 'Crea las 7 provincias de Costa Rica (solo administradores)',
              authentication: 'bearer'
            }
          ]
        })
      },
      {
        title: 'Usuarios',
        version: 'v1.0.0',
        summary: 'Gestión de usuarios para administradores',
        content: JSON.stringify({
          format: 'swagger-summary',
          module: {
            title: 'Gestión de Usuarios',
            description: 'Sistema completo de gestión de usuarios con control de roles',
            baseUrl: '/api/users',
            icon: 'users'
          },
          endpoints: [
            {
              method: 'GET',
              path: '/api/users',
              summary: 'Listar usuarios',
              description: 'Lista todos los usuarios con paginación y búsqueda (solo administradores)',
              authentication: 'bearer',
              parameters: [
                { name: 'search', in: 'query', required: false, type: 'string', description: 'Buscar por username' },
                { name: 'page', in: 'query', required: false, type: 'number', description: 'Número de página' },
                { name: 'limit', in: 'query', required: false, type: 'number', description: 'Items por página' }
              ],
              responses: [
                {
                  status: 200,
                  description: 'Lista de usuarios',
                  body: {
                    data: [
                      {
                        id: 'uuid',
                        username: 'admin',
                        role: 'ADMIN',
                        isActive: true,
                        createdAt: '2025-01-01T00:00:00Z',
                        updatedAt: '2025-01-01T00:00:00Z'
                      }
                    ],
                    meta: {
                      total: 1,
                      page: 1,
                      limit: 20
                    }
                  }
                }
              ]
            },
            {
              method: 'POST',
              path: '/api/users',
              summary: 'Crear usuario',
              description: 'Crea un nuevo usuario en el sistema (solo administradores)',
              authentication: 'bearer',
              parameters: [
                { name: 'username', in: 'body', required: true, type: 'string', description: 'Nombre de usuario' },
                { name: 'password', in: 'body', required: true, type: 'string', description: 'Contraseña' },
                { name: 'role', in: 'body', required: false, type: 'string', description: 'Rol del usuario' },
                { name: 'isActive', in: 'body', required: false, type: 'boolean', description: 'Estado del usuario' }
              ],
              responses: [
                {
                  status: 201,
                  description: 'Usuario creado',
                  body: {
                    id: 'uuid',
                    username: 'newuser',
                    role: 'OPERATOR',
                    isActive: true,
                    createdAt: '2025-01-01T00:00:00Z',
                    updatedAt: '2025-01-01T00:00:00Z'
                  }
                }
              ]
            },
            {
              method: 'PUT',
              path: '/api/users/{id}',
              summary: 'Actualizar usuario',
              description: 'Actualiza un usuario existente (solo administradores)',
              authentication: 'bearer',
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'string', description: 'ID del usuario' }
              ],
              examples: {
                'Actualizar contraseña': `curl -X PUT https://catalogos-fe.vercel.app/api/users/{id} \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "password": "nueva-contraseña"
  }'`
              }
            },
            {
              method: 'DELETE',
              path: '/api/users/{id}',
              summary: 'Eliminar usuario',
              description: 'Elimina un usuario del sistema (solo administradores)',
              authentication: 'bearer',
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'string', description: 'ID del usuario' }
              ],
              responses: [
                {
                  status: 200,
                  description: 'Usuario eliminado',
                  body: { success: true }
                }
              ]
            }
          ]
        })
      },
      {
        title: 'Documentación API',
        version: 'v1.0.0',
        summary: 'Sistema auto-documentado para integraciones externas',
        content: JSON.stringify({
          format: 'swagger-summary',
          module: {
            title: 'Documentación de API',
            description: 'Sistema de documentación auto-contenida para facilitar integraciones externas',
            baseUrl: '/api/api-docs',
            icon: 'book'
          },
          endpoints: [
            {
              method: 'GET',
              path: '/api/api-docs',
              summary: 'Listar documentación',
              description: 'Lista toda la documentación de API disponible',
              authentication: 'bearer',
              responses: [
                {
                  status: 200,
                  description: 'Lista de documentación',
                  body: {
                    data: [
                      {
                        id: 'uuid',
                        title: 'Authentication API',
                        version: 'v1.0.0',
                        summary: 'Endpoints de autenticación',
                        createdAt: '2025-01-01T00:00:00Z',
                        updatedAt: '2025-01-01T00:00:00Z'
                      }
                    ],
                    meta: {
                      total: 5,
                      page: 1,
                      limit: 20
                    }
                  }
                }
              ]
            },
            {
              method: 'GET',
              path: '/api/api-docs/{id}',
              summary: 'Obtener documentación específica',
              description: 'Obtiene documentación completa para una API específica',
              authentication: 'bearer',
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'string', description: 'ID del documento' }
              ]
            },
            {
              method: 'POST',
              path: '/api/api-docs',
              summary: 'Crear documentación',
              description: 'Crea nueva documentación de API (solo administradores)',
              authentication: 'bearer',
              parameters: [
                { name: 'title', in: 'body', required: true, type: 'string', description: 'Título del documento' },
                { name: 'version', in: 'body', required: true, type: 'string', description: 'Versión' },
                { name: 'summary', in: 'body', required: true, type: 'string', description: 'Resumen' },
                { name: 'content', in: 'body', required: true, type: 'string', description: 'Contenido completo' }
              ]
            },
            {
              method: 'PUT',
              path: '/api/api-docs/{id}',
              summary: 'Actualizar documentación',
              description: 'Actualiza documentación existente (solo administradores)',
              authentication: 'bearer',
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'string', description: 'ID del documento' }
              ]
            },
            {
              method: 'DELETE',
              path: '/api/api-docs/{id}',
              summary: 'Eliminar documentación',
              description: 'Elimina documentación de API (solo administradores)',
              authentication: 'bearer',
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'string', description: 'ID del documento' }
              ]
            }
          ]
        })
      }
    ];

    for (const doc of documentation) {
      await pool.query(
        `INSERT INTO api_documents (title, version, summary, content, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [doc.title, doc.version, doc.summary, doc.content]
      );
    }

    console.log(`API documentation seeded successfully with ${documentation.length} documents`);
    console.log('Available documentation:', documentation.map(d => ({ title: d.title, version: d.version })));
  } catch (error) {
    console.error('Error seeding API documentation:', error);
  }
}

initializeAllTables();

// Catalog endpoints
app.get('/api/catalogs', authenticateToken, async (req, res) => {
  try {
    res.json(catalogDefinitions);
  } catch (error) {
    console.error('List catalogs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/catalogs/:catalogKey', authenticateToken, async (req, res) => {
  try {
    const { catalogKey } = req.params;
    const { search, page = 1, limit = 50 } = req.query;

    const definition = catalogDefinitionsMap.get(catalogKey);
    if (!definition) {
      return res.status(404).json({ message: 'Catalog not found' });
    }

    const pageNumber = Number(page);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 200); // Max 200 items per page

    let query = `SELECT * FROM ${definition.tableName}`;
    const params: any[] = [];

    if (search) {
      const searchConditions = definition.searchFields.map((field: string, index: number) => {
        return `CAST(${field} AS TEXT) ILIKE $${index + 1}`;
      });
      query += ` WHERE ${searchConditions.join(' OR ')}`;
      params.push(...definition.searchFields.map(() => `%${search}%`));
    }

    query += ` ORDER BY updated_at DESC, id DESC`;

    const offset = (pageNumber - 1) * limitNumber;
    query += ` LIMIT ${limitNumber} OFFSET ${offset}`;

    const countQuery = search
      ? `SELECT COUNT(*) FROM ${definition.tableName} WHERE ${definition.searchFields.map((field: string, index: number) => `CAST(${field} AS TEXT) ILIKE $${index + 1}`).join(' OR ')}`
      : `SELECT COUNT(*) FROM ${definition.tableName}`;

    const [itemsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params)
    ]);

    // Transform database row keys from snake_case to camelCase for frontend compatibility
    const transformedData = itemsResult.rows.map(row => transformRowKeys(row));

    // Format response to match original NestJS API structure
    res.json({
      data: transformedData,
      meta: {
        total: Number(countResult.rows[0].count),
        page: pageNumber,
        limit: limitNumber
      }
    });
  } catch (error) {
    console.error('Find all catalog items error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/catalogs/:catalogKey/:id', authenticateToken, async (req, res) => {
  try {
    const { catalogKey, id } = req.params;

    const definition = catalogDefinitionsMap.get(catalogKey);
    if (!definition) {
      return res.status(404).json({ message: 'Catalog not found' });
    }

    const result = await pool.query(
      `SELECT * FROM ${definition.tableName} WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Transform database row keys from snake_case to camelCase for frontend compatibility
    const transformedRow = transformRowKeys(result.rows[0]);

    res.json(transformedRow);
  } catch (error) {
    console.error('Find one catalog item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/catalogs/:catalogKey', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { catalogKey } = req.params;
    const body = req.body;

    const definition = catalogDefinitionsMap.get(catalogKey);
    if (!definition) {
      return res.status(404).json({ message: 'Catalog not found' });
    }

    const fields = definition.fields.map((field: any) => field.name);
    const values = fields.map((field: string, index: number) => {
      const value = body[field];
      if (value === undefined || value === null) {
        return null;
      }
      return value;
    });

    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO ${definition.tableName} (${fields.join(', ')}, created_at, updated_at)
      VALUES (${placeholders}, NOW(), NOW())
      RETURNING *
    `;

    const result = await pool.query(query, values);

    // Transform database row keys from snake_case to camelCase for frontend compatibility
    const transformedRow = transformRowKeys(result.rows[0]);

    res.status(201).json(transformedRow);
  } catch (error) {
    console.error('Create catalog item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/catalogs/:catalogKey/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { catalogKey, id } = req.params;
    const body = req.body;

    const definition = catalogDefinitionsMap.get(catalogKey);
    if (!definition) {
      return res.status(404).json({ message: 'Catalog not found' });
    }

    const fields = definition.fields.map((field: any) => field.name);
    const setClause = fields.map((field: string, index: number) => {
      return `${field} = $${index + 1}`;
    }).join(', ');

    const values = fields.map((field: string) => {
      const value = body[field];
      if (value === undefined || value === null) {
        return null;
      }
      return value;
    });

    const query = `
      UPDATE ${definition.tableName}
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${fields.length + 1}
      RETURNING *
    `;

    const result = await pool.query(query, [...values, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Transform database row keys from snake_case to camelCase for frontend compatibility
    const transformedRow = transformRowKeys(result.rows[0]);

    res.json(transformedRow);
  } catch (error) {
    console.error('Update catalog item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/catalogs/:catalogKey/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { catalogKey, id } = req.params;

    const definition = catalogDefinitionsMap.get(catalogKey);
    if (!definition) {
      return res.status(404).json({ message: 'Catalog not found' });
    }

    const result = await pool.query(
      `DELETE FROM ${definition.tableName} WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete catalog item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Import catalog items from Excel
app.post('/api/catalogs/:catalogKey/import', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { catalogKey } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const definition = catalogDefinitionsMap.get(catalogKey);
    if (!definition) {
      return res.status(404).json({ message: 'Catalog not found' });
    }

    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty or invalid format' });
    }

    // Validate required columns
    const firstRow = jsonData[0] as any;
    const hasDescripcion = 'descripcion' in firstRow || 'descripción' in firstRow || 'Descripcion' in firstRow || 'Description' in firstRow;
    const hasNombre = 'nombre' in firstRow || 'Nombre' in firstRow || 'name' in firstRow || 'Name' in firstRow;
    const hasCodigo = 'codigo' in firstRow || 'código' in firstRow || 'Codigo' in firstRow || 'Code' in firstRow;

    // Special validation for unidades-medida
    if (catalogKey === 'unidades-medida') {
      const hasUnidad = 'unidad' in firstRow || 'Unidad' in firstRow || 'unit' in firstRow || 'Unit' in firstRow;
      const hasSimbolo = 'simbolo' in firstRow || 'símbolo' in firstRow || 'Simbolo' in firstRow || 'Símbolo' in firstRow || 'symbol' in firstRow || 'Symbol' in firstRow;
      const hasTipoUnidad = 'tipoUnidad' in firstRow || 'tipounidad' in firstRow || 'TipoUnidad' in firstRow || 'tipo unidad' in firstRow || 'Tipo Unidad' in firstRow || 'unitType' in firstRow || 'unittype' in firstRow;

      if (!hasUnidad || !hasSimbolo || !hasTipoUnidad) {
        return res.status(400).json({
          message: 'Excel file for unidades-medida must contain columns for unidad, simbolo, and tipoUnidad',
          requiredColumns: ['unidad', 'simbolo', 'tipoUnidad'],
          foundColumns: Object.keys(firstRow)
        });
      }
    }

    // Special validation for codigos-moneda
    if (catalogKey === 'codigos-moneda') {
      const hasPais = 'pais' in firstRow || 'Pais' in firstRow || 'país' in firstRow || 'País' in firstRow || 'country' in firstRow || 'Country' in firstRow;
      const hasMoneda = 'moneda' in firstRow || 'Moneda' in firstRow || 'currency' in firstRow || 'Currency' in firstRow;
      const hasCodigo = 'codigo' in firstRow || 'código' in firstRow || 'Codigo' in firstRow || 'Código' in firstRow || 'code' in firstRow || 'Code' in firstRow;

      if (!hasPais || !hasMoneda || !hasCodigo) {
        return res.status(400).json({
          message: 'Excel file for codigos-moneda must contain columns for pais, moneda, and codigo',
          requiredColumns: ['pais', 'moneda', 'codigo'],
          foundColumns: Object.keys(firstRow)
        });
      }
    }

    // Check if this catalog uses 'nombre' instead of 'descripcion'
    const usesNombre = definition.fields.some(field => field.name === 'nombre');

    if (catalogKey !== 'unidades-medida' && catalogKey !== 'codigos-moneda') {
      if (usesNombre) {
        if (!hasNombre) {
          return res.status(400).json({
            message: 'Excel file must contain a "nombre" column'
          });
        }
      } else {
        if (!hasDescripcion) {
          return res.status(400).json({
            message: 'Excel file must contain a "descripcion" column'
          });
        }
      }
    }

    const tableName = definition.tableName;
    let insertedCount = 0;
    let skippedCount = 0;
    const errors = [];

    // Process each row
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as any;

      try {
        // Extract values with flexible column name matching
        let descripcionField = row.descripcion || row.descripción || row.Descripcion || row.Description || row.descripcion?.trim();
        let nombreField = row.nombre || row.Nombre || row.name || row.Name || row.nombre?.trim();
        let codigo = row.codigo || row.código || row.Codigo || row.Code || row.codigo?.trim();

        // Special handling for unidades-medida
        if (catalogKey === 'unidades-medida') {
          const unidad = row.unidad || row.Unidad || row.unit || row.Unit;
          const simbolo = row.simbolo || row.símbolo || row.Simbolo || row.Símbolo || row.symbol || row.Symbol;
          const tipoUnidad = row.tipoUnidad || row.tipounidad || row.TipoUnidad || row['tipo unidad'] || row['Tipo Unidad'] || row.unitType || row.unittype;

          if (!unidad || unidad.toString().trim() === '') {
            (errors as string[]).push(`Row ${i + 2}: unidad is required`);
            skippedCount++;
            continue;
          }
          if (!simbolo || simbolo.toString().trim() === '') {
            (errors as string[]).push(`Row ${i + 2}: simbolo is required`);
            skippedCount++;
            continue;
          }
          if (!tipoUnidad || tipoUnidad.toString().trim() === '') {
            (errors as string[]).push(`Row ${i + 2}: tipoUnidad is required`);
            skippedCount++;
            continue;
          }

          // Check if unidad already exists
          const existingItem = await pool.query(
            `SELECT id FROM ${tableName} WHERE LOWER(TRIM(unidad)) = LOWER($1)`,
            [unidad.toString().trim()]
          );

          if (existingItem.rows.length > 0) {
            skippedCount++;
            continue;
          }

          // Insert the new unidad-medida record
          const insertQuery = `
            INSERT INTO ${tableName} (unidad, simbolo, tipoUnidad)
            VALUES ($1, $2, $3)
          `;

          await pool.query(insertQuery, [
            unidad.toString().trim(),
            simbolo.toString().trim(),
            tipoUnidad.toString().trim()
          ]);

          insertedCount++;
          continue;
        }

        // Special handling for codigos-moneda
        if (catalogKey === 'codigos-moneda') {
          const pais = row.pais || row.Pais || row.país || row.País || row.country || row.Country;
          const moneda = row.moneda || row.Moneda || row.currency || row.Currency;
          const codigo = row.codigo || row.código || row.Codigo || row.Código || row.code || row.Code;

          if (!pais || pais.toString().trim() === '') {
            (errors as string[]).push(`Row ${i + 2}: pais is required`);
            skippedCount++;
            continue;
          }
          if (!moneda || moneda.toString().trim() === '') {
            (errors as string[]).push(`Row ${i + 2}: moneda is required`);
            skippedCount++;
            continue;
          }
          if (!codigo || codigo.toString().trim() === '') {
            (errors as string[]).push(`Row ${i + 2}: codigo is required`);
            skippedCount++;
            continue;
          }

          // Check if codigo already exists (unique field for codigos-moneda)
          const existingItem = await pool.query(
            `SELECT id FROM ${tableName} WHERE codigo = $1`,
            [codigo.toString().trim()]
          );

          if (existingItem.rows.length > 0) {
            skippedCount++;
            continue;
          }

          // Insert the new codigo-moneda record
          const insertQuery = `
            INSERT INTO ${tableName} (pais, moneda, codigo)
            VALUES ($1, $2, $3)
          `;

          await pool.query(insertQuery, [
            pais.toString().trim(),
            moneda.toString().trim(),
            codigo.toString().trim()
          ]);

          insertedCount++;
          continue;
        }

        // Determine which field to use based on catalog structure
        let fieldValue;
        let fieldName;

        if (usesNombre) {
          fieldValue = nombreField;
          fieldName = 'nombre';

          if (!fieldValue || fieldValue.toString().trim() === '') {
            (errors as string[]).push(`Row ${i + 2}: nombre is required`);
            skippedCount++;
            continue;
          }
        } else {
          fieldValue = descripcionField;
          fieldName = 'descripcion';

          if (!fieldValue || fieldValue.toString().trim() === '') {
            (errors as string[]).push(`Row ${i + 2}: descripcion is required`);
            skippedCount++;
            continue;
          }
        }

        fieldValue = fieldValue.toString().trim();

        // Handle codigo (optional for some catalogs, but required for tipos-documento)
        if (catalogKey === 'tipos-documento' && (!codigo || codigo.toString().trim() === '')) {
          (errors as string[]).push(`Row ${i + 2}: codigo is required for tipos-documento`);
          skippedCount++;
          continue;
        }

        // For actividades-economicas, codigo is required (it's unique field)
        if (catalogKey === 'actividades-economicas' && (!codigo || codigo.toString().trim() === '')) {
          (errors as string[]).push(`Row ${i + 2}: codigo is required for actividades-economicas`);
          skippedCount++;
          continue;
        }

        // Handle numeric codes for actividades-economicas and other catalogs with numeric codes
        let codigoValue: string | number | null = null;
        if (codigo) {
          const isNumericCode = definition.fields.some(field =>
            field.name === 'codigo' && field.type === 'numeric'
          );

          if (isNumericCode) {
            const parsedValue = parseFloat(codigo.toString().trim());
            if (isNaN(parsedValue)) {
              (errors as string[]).push(`Row ${i + 2}: codigo must be a valid number`);
              skippedCount++;
              continue;
            }
            codigoValue = parsedValue;
          } else {
            codigoValue = codigo.toString().trim();
          }
        }

        // Check if item already exists (avoid duplicates)
        let checkQuery;
        let checkParams;

        if (codigoValue !== null) {
          checkQuery = `SELECT id FROM ${tableName} WHERE codigo = $1`;
          checkParams = [codigoValue];
        } else {
          const fieldNameToCheck = usesNombre ? 'nombre' : 'descripcion';
          checkQuery = `SELECT id FROM ${tableName} WHERE LOWER(TRIM(${fieldNameToCheck})) = LOWER($1)`;
          checkParams = [fieldValue];
        }

        const existingItem = await pool.query(checkQuery, checkParams);

        if (existingItem.rows.length > 0) {
          skippedCount++;
          continue;
        }

        // Insert new item
        let insertQuery;
        let insertValues;

        if (codigoValue !== null) {
          insertQuery = `INSERT INTO ${tableName} (codigo, ${fieldName}, created_at, updated_at)
                        VALUES ($1, $2, NOW(), NOW()) RETURNING *`;
          insertValues = [codigoValue, fieldValue];
        } else {
          insertQuery = `INSERT INTO ${tableName} (${fieldName}, created_at, updated_at)
                        VALUES ($1, NOW(), NOW()) RETURNING *`;
          insertValues = [fieldValue];
        }

        await pool.query(insertQuery, insertValues);
        insertedCount++;

      } catch (rowError: any) {
        console.error(`Error processing row ${i + 2}:`, rowError);
        (errors as string[]).push(`Row ${i + 2}: ${rowError.message}`);
        skippedCount++;
      }
    }

    const response: any = {
      message: 'Import completed',
      summary: {
        total: jsonData.length,
        inserted: insertedCount,
        skipped: skippedCount,
        errors: errors.length
      },
      details: {
        catalogKey,
        tableName,
        errors: errors.slice(0, 10), // Limit errors to first 10
        hasMoreErrors: errors.length > 10
      }
    };

    if (errors.length > 0) {
      response.warning = 'Some rows had errors and were skipped';
    }

    res.json(response);

  } catch (error) {
    console.error('Import catalog error:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    }

    if (error.message === 'Only Excel files are allowed (.xlsx, .xls)') {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Internal server error during import' });
  }
});

// Update table structure for catalog fields
app.post('/api/catalogs/:catalogKey/update-schema', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { catalogKey } = req.params;

    const definition = catalogDefinitionsMap.get(catalogKey);
    if (!definition) {
      return res.status(404).json({ message: 'Catalog not found' });
    }

    const tableName = definition.tableName;

    // Get current table structure
    const tableStructure = await pool.query(`
      SELECT column_name, data_type, numeric_precision, numeric_scale, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName]);

    console.log(`Current table structure for ${tableName}:`, tableStructure.rows);

    // Check if we need to update codigo column for actividades-economicas
    if (catalogKey === 'actividades-economicas') {
      const codigoColumn = tableStructure.rows.find(col => col.column_name === 'codigo');

      if (codigoColumn && codigoColumn.data_type === 'numeric') {
        console.log('Altering actividades_economicas.codigo from numeric to varchar...');

        // Alter the column from numeric to varchar
        await pool.query(`
          ALTER TABLE ${tableName}
          ALTER COLUMN codigo TYPE VARCHAR(50) USING codigo::VARCHAR(50)
        `);

        console.log('Successfully altered codigo column to VARCHAR(50)');

        res.json({
          message: 'Schema updated successfully',
          catalogKey,
          tableName,
          changes: [
            {
              column: 'codigo',
              from: `${codigoColumn.data_type}(${codigoColumn.numeric_precision},${codigoColumn.numeric_scale})`,
              to: 'VARCHAR(50)'
            }
          ]
        });
      } else if (codigoColumn && codigoColumn.data_type === 'character varying') {
        res.json({
          message: 'Schema already up to date',
          catalogKey,
          tableName,
          currentType: `VARCHAR(${codigoColumn.character_maximum_length})`
        });
      } else {
        res.status(400).json({
          message: 'codigo column not found in table',
          catalogKey,
          tableName,
          existingColumns: tableStructure.rows.map(col => col.column_name)
        });
      }
    } else {
      res.json({
        message: 'No schema updates needed for this catalog',
        catalogKey,
        tableName,
        currentStructure: tableStructure.rows
      });
    }

  } catch (error) {
    console.error('Update schema error:', error);
    res.status(500).json({
      message: 'Internal server error during schema update',
      error: error.message
    });
  }
});

// Clear all records from catalog table
app.delete('/api/catalogs/:catalogKey/clear', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { catalogKey } = req.params;

    const definition = catalogDefinitionsMap.get(catalogKey);
    if (!definition) {
      return res.status(404).json({
        message: 'Catalog not found',
        catalogKey,
        availableCatalogs: Array.from(catalogDefinitionsMap.keys())
      });
    }

    const tableName = definition.tableName;
    console.log(`Attempting to clear table: ${tableName} for catalog: ${catalogKey}`);

    // First, check if table exists
    try {
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        ) as exists
      `, [tableName]);

      if (!tableExists.rows[0].exists) {
        return res.status(404).json({
          message: 'Table does not exist',
          catalogKey,
          tableName
        });
      }
    } catch (tableCheckError) {
      console.error('Table check error:', tableCheckError);
      return res.status(500).json({
        message: 'Error checking table existence',
        catalogKey,
        tableName,
        error: tableCheckError.message
      });
    }

    // Count records before deletion
    let recordCount = 0;
    try {
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
      recordCount = parseInt(countResult.rows[0].count);
      console.log(`Found ${recordCount} records in table ${tableName}`);
    } catch (countError) {
      console.error('Count query error:', countError);
      return res.status(500).json({
        message: 'Error counting records',
        catalogKey,
        tableName,
        error: countError.message
      });
    }

    if (recordCount === 0) {
      return res.json({
        message: 'No records to clear',
        catalogKey,
        tableName,
        recordCount: 0
      });
    }

    // Delete all records with explicit table name
    let deleteResult;
    try {
      deleteResult = await pool.query(`DELETE FROM "${tableName}"`);
      console.log(`Deleted ${deleteResult.rowCount} records from ${tableName}`);
    } catch (deleteError) {
      console.error('Delete query error:', deleteError);
      return res.status(500).json({
        message: 'Error deleting records',
        catalogKey,
        tableName,
        error: deleteError.message
      });
    }

    res.json({
      message: 'All records cleared successfully',
      catalogKey,
      tableName,
      recordsDeleted: recordCount,
      deletedRows: deleteResult.rowCount
    });

  } catch (error) {
    console.error('Clear catalog error:', error);
    res.status(500).json({
      message: 'Internal server error during clear operation',
      catalogKey: req.params.catalogKey,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Simple endpoint to clear actividades-economicas table
app.post('/api/actividades-economicas/clear', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('Starting actividades-economicas clear operation...');

    // Simple count query first
    const countResult = await pool.query('SELECT COUNT(*) as count FROM actividades_economicas');
    const recordCount = parseInt(countResult.rows[0].count);

    console.log(`Found ${recordCount} records in actividades_economicas`);

    if (recordCount === 0) {
      return res.json({
        message: 'No records to clear',
        recordCount: 0
      });
    }

    // Simple delete query
    const deleteResult = await pool.query('DELETE FROM actividades_economicas');

    console.log(`Deleted ${deleteResult.rowCount} records`);

    res.json({
      message: 'Successfully cleared actividades-economicas table',
      recordCount: recordCount,
      deletedRows: deleteResult.rowCount
    });

  } catch (error) {
    console.error('Simple clear error:', error);
    res.status(500).json({
      message: 'Error clearing table',
      error: error.message
    });
  }
});

// Unified endpoint to update all catalog and geography table schemas
app.post('/api/schemas/update-all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('Starting mass schema update operation...');

    const results: any[] = [];

    // Update all catalog schemas
    for (const definition of catalogDefinitions) {
      const tableName = definition.tableName;
      console.log(`Processing catalog: ${definition.key} -> table: ${tableName}`);

      try {
        // Get current table structure
        const tableStructure = await pool.query(`
          SELECT column_name, data_type, numeric_precision, numeric_scale, character_maximum_length
          FROM information_schema.columns
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `, [tableName]);

        const changes: any[] = [];

        for (const field of definition.fields) {
          const columnDef = tableStructure.rows.find(col => col.column_name === field.name);

          if (!columnDef) {
            console.log(`Column ${field.name} not found in table ${tableName}, skipping...`);
            continue;
          }

          const currentType = `${columnDef.data_type}${
            columnDef.numeric_precision ? `(${columnDef.numeric_precision}` : ''
          }${columnDef.numeric_scale ? `,${columnDef.numeric_scale})` : ''
          }${
            columnDef.character_maximum_length ? `(${columnDef.character_maximum_length})` : ''
          }`;

          let desiredType = '';

          if (field.type === 'string') {
            desiredType = field.length ? `VARCHAR(${field.length})` : 'VARCHAR(50)';
          } else if (field.type === 'int') {
            desiredType = 'INTEGER';
          } else if (field.type === 'numeric') {
            desiredType = `NUMERIC(${field.precision || 12},${field.scale || 4})`;
          }

          if (currentType !== desiredType && desiredType) {
            console.log(`Updating ${tableName}.${field.name} from ${currentType} to ${desiredType}`);

            const alterQuery = field.type === 'string'
              ? `ALTER TABLE ${tableName} ALTER COLUMN ${field.name} TYPE ${desiredType} USING ${field.name}::${desiredType}`
              : `ALTER TABLE ${tableName} ALTER COLUMN ${field.name} TYPE ${desiredType}`;

            await pool.query(alterQuery);

            changes.push({
              column: field.name,
              from: currentType,
              to: desiredType
            });
          }
        }

        if (changes.length > 0) {
          results.push({
            catalogKey: definition.key,
            tableName,
            changes: changes,
            status: 'updated'
          });
        } else {
          results.push({
            catalogKey: definition.key,
            tableName,
            changes: [],
            status: 'up_to_date'
          });
        }

      } catch (catalogError) {
        console.error(`Error updating catalog ${definition.key}:`, catalogError);
        results.push({
          catalogKey: definition.key,
          tableName,
          status: 'error',
          error: catalogError.message
        });
      }
    }

    // Update geography table schemas if needed
    const geographyTables = [
      {
        key: 'provincias',
        tableName: 'provincias',
        fields: [
          { name: 'codigo', type: 'int', required: true },
        ]
      },
      {
        key: 'cantones',
        tableName: 'cantones',
        fields: [
          { name: 'provincia', type: 'string', required: true, length: 120 },
          { name: 'codigo_provincia', type: 'int', required: true },
          { name: 'canton', type: 'string', required: true, length: 120 },
          { name: 'codigo_canton', type: 'string', required: true, length: 50 }
        ]
      },
      {
        key: 'distritos',
        tableName: 'distritos',
        fields: [
          { name: 'provincia', type: 'string', required: true, length: 120 },
          { name: 'codigo_provincia', type: 'int', required: true },
          { name: 'canton', type: 'string', required: true, length: 120 },
          { name: 'codigo_canton', type: 'string', required: true, length: 50 },
          { name: 'distrito', type: 'string', required: true, length: 120 },
          { name: 'codigo_distrito', type: 'string', required: true, length: 50 }
        ]
      },
      {
        key: 'barrios',
        tableName: 'barrios',
        fields: [
          { name: 'province_code', type: 'int', required: true },
          { name: 'canton_code', type: 'string', required: true, length: 1024 },
          { name: 'district_code', type: 'string', required: true, length: 1024 },
          { name: 'nombre', type: 'string', required: true, length: 1024 }
        ]
      }
    ];

    for (const table of geographyTables) {
      try {
        const tableStructure = await pool.query(`
          SELECT column_name, data_type, numeric_precision, numeric_scale, character_maximum_length
          FROM information_schema.columns
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `, [table.tableName]);

        const changes: any[] = [];

        for (const field of table.fields) {
          const columnDef = tableStructure.rows.find(col => col.column_name === field.name);

          if (!columnDef) continue;

          const currentType = `${columnDef.data_type}${
            columnDef.numeric_precision ? `(${columnDef.numeric_precision})` : ''
          }${columnDef.numeric_scale ? `,${columnDef.numeric_scale})` : ''
          }${
            columnDef.character_maximum_length ? `(${columnDef.character_maximum_length})` : ''
          }`;

          let desiredType = '';

          if (field.type === 'string') {
            desiredType = field.length ? `VARCHAR(${field.length})` : 'VARCHAR(50)';
          } else if (field.type === 'int') {
            desiredType = 'INTEGER';
          }

          if (currentType !== desiredType && desiredType) {
            console.log(`Updating geography ${table.tableName}.${field.name} from ${currentType} to ${desiredType}`);

            const alterQuery = field.type === 'string'
              ? `ALTER TABLE ${table.tableName} ALTER COLUMN ${field.name} TYPE ${desiredType} USING ${field.name}::${desiredType}`
              : `ALTER TABLE ${table.tableName} ALTER COLUMN ${field.name} TYPE ${desiredType}`;

            await pool.query(alterQuery);

            changes.push({
              column: field.name,
              from: currentType,
              to: desiredType
            });
          }
        }

        if (changes.length > 0) {
          results.push({
            catalogKey: table.key,
            tableName: table.tableName,
            changes: changes,
            status: 'updated',
            type: 'geography'
          });
        }

      } catch (geoError) {
        console.error(`Error updating geography table ${table.tableName}:`, geoError);
        results.push({
          catalogKey: table.key,
          tableName: table.tableName,
          status: 'error',
          error: geoError.message,
          type: 'geography'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'updated' || r.status === 'up_to_date').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    res.json({
      message: 'Schema update operation completed',
      summary: {
        total: results.length,
        success: successCount,
        errors: errorCount
      },
      results: results
    });

  } catch (error) {
    console.error('Update all schemas error:', error);
    res.status(500).json({
      message: 'Internal server error during mass schema update',
      error: error.message
    });
  }
});

// Endpoint to clear all catalog and geography data
app.delete('/api/clear-all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('Starting mass data clearing operation...');

    const results: any[] = [];
    let totalDeleted = 0;

    // Clear all catalog tables
    for (const definition of catalogDefinitions) {
      const tableName = definition.tableName;

      try {
        // Count records first
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const recordCount = parseInt(countResult.rows[0].count);

        if (recordCount > 0) {
          const deleteResult = await pool.query(`DELETE FROM "${tableName}"`);
          console.log(`Deleted ${deleteResult.rowCount} records from ${tableName}`);

          totalDeleted += deleteResult.rowCount;

          results.push({
            catalogKey: definition.key,
            tableName,
            recordsDeleted: deleteResult.rowCount,
            status: 'cleared'
          });
        } else {
          results.push({
            catalogKey: definition.key,
            tableName,
            recordsDeleted: 0,
            status: 'already_empty'
          });
        }

      } catch (catalogError) {
        console.error(`Error clearing catalog ${definition.key}:`, catalogError);
        results.push({
          catalogKey: definition.key,
          tableName,
          status: 'error',
          error: catalogError.message
        });
      }
    }

    // Clear geography tables
    const geographyTables = ['provincias', 'cantones', 'distritos', 'barrios'];

    for (const tableName of geographyTables) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const recordCount = parseInt(countResult.rows[0].count);

        if (recordCount > 0) {
          const deleteResult = await pool.query(`DELETE FROM "${tableName}"`);
          console.log(`Deleted ${deleteResult.rowCount} records from ${tableName}`);

          totalDeleted += deleteResult.rowCount;

          results.push({
            catalogKey: tableName,
            tableName,
            recordsDeleted: deleteResult.rowCount,
            status: 'cleared',
            type: 'geography'
          });
        } else {
          results.push({
            catalogKey: tableName,
            tableName,
            recordsDeleted: 0,
            status: 'already_empty',
            type: 'geography'
          });
        }

      } catch (geoError) {
        console.error(`Error clearing geography table ${tableName}:`, geoError);
        results.push({
          catalogKey: tableName,
          tableName,
          status: 'error',
          error: geoError.message,
          type: 'geography'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'cleared').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    res.json({
      message: 'Mass clear operation completed',
      summary: {
        total: results.length,
        success: successCount,
        errors: errorCount,
        totalRecordsDeleted: totalDeleted
      },
      results: results
    });

  } catch (error) {
    console.error('Clear all data error:', error);
    res.status(500).json({
      message: 'Internal server error during mass clear operation',
      error: error.message
    });
  }
});

// Geography endpoints
app.get('/api/geography/provinces', authenticateToken, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 200);

    let query = 'SELECT * FROM provincias';
    const countQuery = 'SELECT COUNT(*) FROM provincias';
    const params: any[] = [];

    if (search) {
      query += ' WHERE CAST(nombre AS TEXT) ILIKE $1 OR CAST(codigo AS TEXT) ILIKE $1';
      const searchCountQuery = 'SELECT COUNT(*) FROM provincias WHERE CAST(nombre AS TEXT) ILIKE $1 OR CAST(codigo AS TEXT) ILIKE $1';
      params.push(`%${search}%`);

      const [itemsResult, countResult] = await Promise.all([
        pool.query(`${query} ORDER BY codigo ASC LIMIT ${limitNumber} OFFSET ${(pageNumber - 1) * limitNumber}`, params),
        pool.query(searchCountQuery, params)
      ]);

      res.json({
        data: itemsResult.rows,
        meta: {
          total: Number(countResult.rows[0].count),
          page: pageNumber,
          limit: limitNumber
        }
      });
    } else {
      const [itemsResult, countResult] = await Promise.all([
        pool.query(`${query} ORDER BY codigo ASC LIMIT ${limitNumber} OFFSET ${(pageNumber - 1) * limitNumber}`),
        pool.query(countQuery)
      ]);

      res.json({
        data: itemsResult.rows,
        meta: {
          total: Number(countResult.rows[0].count),
          page: pageNumber,
          limit: limitNumber
        }
      });
    }
  } catch (error) {
    console.error('Get provinces error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// General cantons endpoint (all cantons)
app.get('/api/geography/cantons', authenticateToken, async (req, res) => {
  try {
    const { search, page = 1, limit = 50, provinceCode } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 200);

    let query = 'SELECT * FROM cantones';
    let countQuery = 'SELECT COUNT(*) FROM cantones';
    const params: any[] = [];
    const countParams: any[] = [];

    // Build WHERE conditions
    const whereConditions: string[] = [];

    if (provinceCode) {
      whereConditions.push('codigo_provincia = $' + (params.length + 1));
      params.push(provinceCode);
      countParams.push(provinceCode);
    }

    if (search) {
      const searchConditions = [
        'CAST(canton AS TEXT) ILIKE $' + (params.length + 1),
        'CAST(codigo_canton AS TEXT) ILIKE $' + (params.length + 1),
        'CAST(provincia AS TEXT) ILIKE $' + (params.length + 1),
        'CAST(codigo_provincia AS TEXT) ILIKE $' + (params.length + 2)
      ];
      whereConditions.push('(' + searchConditions.join(' OR ') + ')');
      params.push(`%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`);
    }

    // Add WHERE clause if there are conditions
    if (whereConditions.length > 0) {
      const whereClause = ' WHERE ' + whereConditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    query += ' ORDER BY codigo_provincia ASC, codigo_canton ASC';
    const offset = (pageNumber - 1) * limitNumber;
    query += ` LIMIT ${limitNumber} OFFSET ${offset}`;

    const [itemsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    // Transform database row keys from snake_case to camelCase for frontend compatibility
    const transformedData = itemsResult.rows.map(row => {
      // Manual transformation for cantones to ensure correct field names
      const transformed: any = {
        id: row.id,
        provincia: row.provincia,
        codigoProvincia: row.codigo_provincia,
        canton: row.canton,
        codigoCanton: row.codigo_canton,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      // Keep any additional fields that might exist
      Object.keys(row).forEach(key => {
        if (!transformed.hasOwnProperty(key) && key !== 'created_at' && key !== 'updated_at') {
          transformed[toCamelCase(key)] = row[key];
        }
      });

      console.log('Transformed canton row:', transformed); // Debug log
      return transformed;
    });

    console.log('Transformed cantons data sample:', transformedData.slice(0, 2)); // Debug log

    res.json({
      data: transformedData,
      meta: {
        total: Number(countResult.rows[0].count),
        page: pageNumber,
        limit: limitNumber
      }
    });
  } catch (error) {
    console.error('Get all cantons error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// General districts endpoint (all districts)
app.get('/api/geography/districts', authenticateToken, async (req, res) => {
  try {
    const { search, page = 1, limit = 50, provinceCode, cantonCode } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 200);

    let query = 'SELECT * FROM distritos';
    let countQuery = 'SELECT COUNT(*) FROM distritos';
    const params: any[] = [];
    const countParams: any[] = [];

    // Build WHERE conditions
    const whereConditions: string[] = [];

    if (provinceCode) {
      whereConditions.push('province_code = $' + (params.length + 1));
      params.push(provinceCode);
      countParams.push(provinceCode);
    }

    if (cantonCode) {
      whereConditions.push('canton_code = $' + (params.length + 1));
      params.push(cantonCode);
      countParams.push(cantonCode);
    }

    if (search) {
      const searchConditions = [
        'CAST(nombre AS TEXT) ILIKE $' + (params.length + 1),
        'CAST(codigo AS TEXT) ILIKE $' + (params.length + 1),
        'CAST(provincia_nombre AS TEXT) ILIKE $' + (params.length + 1),
        'CAST(canton_nombre AS TEXT) ILIKE $' + (params.length + 1)
      ];
      whereConditions.push('(' + searchConditions.join(' OR ') + ')');
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    // Add WHERE clause if there are conditions
    if (whereConditions.length > 0) {
      const whereClause = ' WHERE ' + whereConditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    query += ' ORDER BY province_code ASC, canton_code ASC, codigo ASC';
    const offset = (pageNumber - 1) * limitNumber;
    query += ` LIMIT ${limitNumber} OFFSET ${offset}`;

    const [itemsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    res.json({
      data: itemsResult.rows,
      meta: {
        total: Number(countResult.rows[0].count),
        page: pageNumber,
        limit: limitNumber
      }
    });
  } catch (error) {
    console.error('Get all districts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// General barrios endpoint (all barrios)
app.get('/api/geography/barrios', authenticateToken, async (req, res) => {
  try {
    const { search, page = 1, limit = 50, provinceCode, cantonCode, districtName } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 200);

    let query = 'SELECT * FROM barrios';
    const params: any[] = [];

    if (provinceCode) {
      query += ' WHERE province_code = $1';
      params.push(provinceCode);
    }

    if (cantonCode) {
      const condition = provinceCode ? ' AND canton_code = $2' : ' WHERE canton_code = $1';
      query += condition;
      params.push(cantonCode);
    }

    if (districtName) {
      const paramIndex = params.length + 1;
      const condition = (provinceCode || cantonCode) ? ` AND LOWER(district_name) = $${paramIndex}` : ' WHERE LOWER(district_name) = $1';
      query += condition;
      params.push(String(districtName).toLowerCase());
    }

    if (search) {
      const paramIndex = params.length + 1;
      const searchCondition = (provinceCode || cantonCode || districtName)
        ? ` AND (CAST(nombre AS TEXT) ILIKE $${paramIndex} OR CAST(district_name AS TEXT) ILIKE $${paramIndex} OR CAST(canton_nombre AS TEXT) ILIKE $${paramIndex} OR CAST(provincia_nombre AS TEXT) ILIKE $${paramIndex})`
        : ` WHERE (CAST(nombre AS TEXT) ILIKE $1 OR CAST(district_name AS TEXT) ILIKE $1 OR CAST(canton_nombre AS TEXT) ILIKE $1 OR CAST(provincia_nombre AS TEXT) ILIKE $1)`;
      query += searchCondition;
      params.push(`%${search}%`);
    }

    // Build count query
    let countQuery = 'SELECT COUNT(*) FROM barrios';
    const countParams = [...params];

    if (provinceCode) {
      countQuery += ' WHERE province_code = $1';
    }
    if (cantonCode) {
      countQuery += provinceCode ? ' AND canton_code = $2' : ' WHERE canton_code = $1';
    }
    if (districtName) {
      const paramIndex = (provinceCode ? 1 : 0) + (cantonCode ? 1 : 0) + 1;
      countQuery += (provinceCode || cantonCode) ? ` AND LOWER(district_name) = $${paramIndex}` : ' WHERE LOWER(district_name) = $1';
    }
    if (search) {
      const paramIndex = countParams.length;
      countQuery += (provinceCode || cantonCode || districtName)
        ? ` AND (CAST(nombre AS TEXT) ILIKE $${paramIndex} OR CAST(district_name AS TEXT) ILIKE $${paramIndex} OR CAST(canton_nombre AS TEXT) ILIKE $${paramIndex} OR CAST(provincia_nombre AS TEXT) ILIKE $${paramIndex})`
        : ` WHERE (CAST(nombre AS TEXT) ILIKE $1 OR CAST(district_name AS TEXT) ILIKE $1 OR CAST(canton_nombre AS TEXT) ILIKE $1 OR CAST(provincia_nombre AS TEXT) ILIKE $1)`;
    }

    query += ' ORDER BY province_code ASC, canton_code ASC, district_name ASC, nombre ASC';
    const offset = (pageNumber - 1) * limitNumber;
    query += ` LIMIT ${limitNumber} OFFSET ${offset}`;

    const [itemsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    res.json({
      data: itemsResult.rows,
      meta: {
        total: Number(countResult.rows[0].count),
        page: pageNumber,
        limit: limitNumber
      }
    });
  } catch (error) {
    console.error('Get all barrios error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/geography/provinces/:provinceCode/cantons', authenticateToken, async (req, res) => {
  try {
    const { provinceCode } = req.params;
    const { search, page = 1, limit = 50 } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 200);

    let query = 'SELECT * FROM cantones WHERE codigo_provincia = $1';
    const params: any[] = [provinceCode];

    if (search) {
      query += ' AND (CAST(canton AS TEXT) ILIKE $2 OR CAST(codigo_canton AS TEXT) ILIKE $2 OR CAST(provincia AS TEXT) ILIKE $2)';
      params.push(`%${search}%`);
    }

    const countQuery = search
      ? `SELECT COUNT(*) FROM cantones WHERE codigo_provincia = $1 AND (CAST(canton AS TEXT) ILIKE $2 OR CAST(codigo_canton AS TEXT) ILIKE $2 OR CAST(provincia AS TEXT) ILIKE $2)`
      : 'SELECT COUNT(*) FROM cantones WHERE codigo_provincia = $1';

    query += ' ORDER BY codigo_canton ASC';
    const offset = (pageNumber - 1) * limitNumber;
    query += ` LIMIT ${limitNumber} OFFSET ${offset}`;

    const [itemsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params)
    ]);

    // Transform database row keys from snake_case to camelCase for frontend compatibility
    const transformedData = itemsResult.rows.map(row => transformRowKeys(row));

    res.json({
      data: transformedData,
      meta: {
        total: Number(countResult.rows[0].count),
        page: pageNumber,
        limit: limitNumber
      }
    });
  } catch (error) {
    console.error('Get cantons error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/geography/provinces/:provinceCode/cantons/:cantonCode/districts', authenticateToken, async (req, res) => {
  try {
    const { provinceCode, cantonCode } = req.params;
    const { search, page = 1, limit = 50 } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 200);

    let query = 'SELECT * FROM distritos WHERE province_code = $1 AND canton_code = $2';
    const params: any[] = [provinceCode, cantonCode];

    if (search) {
      query += ' AND (CAST(nombre AS TEXT) ILIKE $3 OR CAST(codigo AS TEXT) ILIKE $3 OR CAST(provincia_nombre AS TEXT) ILIKE $3 OR CAST(canton_nombre AS TEXT) ILIKE $3)';
      params.push(`%${search}%`);
    }

    const countQuery = search
      ? `SELECT COUNT(*) FROM distritos WHERE province_code = $1 AND canton_code = $2 AND (CAST(nombre AS TEXT) ILIKE $3 OR CAST(codigo AS TEXT) ILIKE $3 OR CAST(provincia_nombre AS TEXT) ILIKE $3 OR CAST(canton_nombre AS TEXT) ILIKE $3)`
      : 'SELECT COUNT(*) FROM distritos WHERE province_code = $1 AND canton_code = $2';

    query += ' ORDER BY codigo ASC';
    const offset = (pageNumber - 1) * limitNumber;
    query += ` LIMIT ${limitNumber} OFFSET ${offset}`;

    const [itemsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params)
    ]);

    res.json({
      data: itemsResult.rows,
      meta: {
        total: Number(countResult.rows[0].count),
        page: pageNumber,
        limit: limitNumber
      }
    });
  } catch (error) {
    console.error('Get districts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/geography/districts/:districtId/barrios', authenticateToken, async (req, res) => {
  try {
    const { districtId } = req.params;
    const { search, page = 1, limit = 50 } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 200);

    let query = `SELECT b.* FROM barrios b
                 JOIN distritos d ON b.province_code = d.province_code AND b.canton_code = d.canton_code AND b.district_name = d.nombre
                 WHERE d.id = $1`;
    const countQuery = `SELECT COUNT(*) FROM barrios b
                        JOIN distritos d ON b.province_code = d.province_code AND b.canton_code = d.canton_code AND b.district_name = d.nombre
                        WHERE d.id = $1`;
    const params: any[] = [districtId];

    if (search) {
      query += ' AND (CAST(b.nombre AS TEXT) ILIKE $2 OR CAST(b.district_name AS TEXT) ILIKE $2 OR CAST(b.canton_nombre AS TEXT) ILIKE $2 OR CAST(b.provincia_nombre AS TEXT) ILIKE $2)';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY b.nombre ASC';
    const offset = (pageNumber - 1) * limitNumber;
    query += ` LIMIT ${limitNumber} OFFSET ${offset}`;

    const [itemsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params)
    ]);

    res.json({
      data: itemsResult.rows,
      meta: {
        total: Number(countResult.rows[0].count),
        page: pageNumber,
        limit: limitNumber
      }
    });
  } catch (error) {
    console.error('Get barrios error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/geography/cantons/:cantonId/barrios', authenticateToken, async (req, res) => {
  try {
    const { cantonId } = req.params;
    const { search, page = 1, limit = 50 } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 200);

    let query = `SELECT b.* FROM barrios b
                 JOIN cantones c ON b.province_code = c.province_code AND b.canton_code = c.codigo
                 WHERE c.id = $1`;
    const countQuery = `SELECT COUNT(*) FROM barrios b
                        JOIN cantones c ON b.province_code = c.province_code AND b.canton_code = c.codigo
                        WHERE c.id = $1`;
    const params: any[] = [cantonId];

    if (search) {
      query += ' AND (CAST(b.nombre AS TEXT) ILIKE $2 OR CAST(b.district_name AS TEXT) ILIKE $2 OR CAST(b.canton_nombre AS TEXT) ILIKE $2 OR CAST(b.provincia_nombre AS TEXT) ILIKE $2)';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY b.nombre ASC';
    const offset = (pageNumber - 1) * limitNumber;
    query += ` LIMIT ${limitNumber} OFFSET ${offset}`;

    const [itemsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params)
    ]);

    res.json({
      data: itemsResult.rows,
      meta: {
        total: Number(countResult.rows[0].count),
        page: pageNumber,
        limit: limitNumber
      }
    });
  } catch (error) {
    console.error('Get barrios by canton error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Users endpoints
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 100);

    let query = 'SELECT id, username, role, is_active, created_at, updated_at FROM users';
    let countQuery = 'SELECT COUNT(*) FROM users';
    const params: any[] = [];
    const countParams: any[] = [];

    // Build WHERE conditions
    const whereConditions: string[] = [];

    if (search) {
      const searchTerm = String(search).trim().toLowerCase();
      whereConditions.push('LOWER(username) ILIKE $' + (params.length + 1));
      params.push(`%${searchTerm}%`);
      countParams.push(`%${searchTerm}%`);
    }

    // Add WHERE clause if there are conditions
    if (whereConditions.length > 0) {
      const whereClause = ' WHERE ' + whereConditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    query += ' ORDER BY created_at DESC, id DESC';
    const offset = (pageNumber - 1) * limitNumber;
    query += ` LIMIT ${limitNumber} OFFSET ${offset}`;

    const [usersResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    // Format users response (exclude password hash)
    const users = usersResult.rows.map(user => ({
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));

    res.json({
      data: users,
      meta: {
        total: Number(countResult.rows[0].count),
        page: pageNumber,
        limit: limitNumber
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT id, username, role, is_active, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = {
      id: result.rows[0].id,
      username: result.rows[0].username,
      role: result.rows[0].role,
      isActive: result.rows[0].is_active,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    };

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, role = 'OPERATOR', isActive = true } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Normalize username to lowercase
    const normalisedUsername = username.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [normalisedUsername]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'El usuario ya existe' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, username, role, is_active, created_at, updated_at`,
      [normalisedUsername, passwordHash, role, isActive]
    );

    const user = {
      id: result.rows[0].id,
      username: result.rows[0].username,
      role: result.rows[0].role,
      isActive: result.rows[0].is_active,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    };

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role, isActive } = req.body;

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id, username FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Check for username change
    if (username && username.trim() !== existingUser.rows[0].username) {
      const normalisedUsername = username.toLowerCase().trim();

      // Check if new username already exists
      const duplicateUser = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [normalisedUsername, id]
      );

      if (duplicateUser.rows.length > 0) {
        return res.status(409).json({ message: `El usuario "${username}" ya existe` });
      }

      updates.push(`username = $${paramIndex++}`);
      params.push(normalisedUsername);
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      updates.push(`password_hash = $${paramIndex++}`);
      params.push(passwordHash);
    }

    if (role) {
      updates.push(`role = $${paramIndex++}`);
      params.push(role);
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id); // For WHERE clause

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, username, role, is_active, created_at, updated_at`,
      params
    );

    const user = {
      id: result.rows[0].id,
      username: result.rows[0].username,
      role: result.rows[0].role,
      isActive: result.rows[0].is_active,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    };

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req: express.Request & { user?: JwtPayload }, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user && req.user.sub === id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propio usuario' });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create initial Costa Rica geography data
app.post('/api/geography/seed', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Check if data already exists
    const existingProvinces = await pool.query('SELECT COUNT(*) as count FROM provincias');
    if (parseInt(existingProvinces.rows[0].count) > 0) {
      return res.json({ message: 'Geography data already exists' });
    }

    // Insert provinces
    const provinces = [
      { nombre: 'San José', codigo: 1 },
      { nombre: 'Alajuela', codigo: 2 },
      { nombre: 'Cartago', codigo: 3 },
      { nombre: 'Heredia', codigo: 4 },
      { nombre: 'Guanacaste', codigo: 5 },
      { nombre: 'Puntarenas', codigo: 6 },
      { nombre: 'Limón', codigo: 7 }
    ];

    for (const province of provinces) {
      await pool.query(
        'INSERT INTO provincias (nombre, codigo) VALUES ($1, $2)',
        [province.nombre, province.codigo]
      );
    }

    res.json({
      message: 'Geography data seeded successfully',
      provincesInserted: provinces.length
    });
  } catch (error) {
    console.error('Seed geography data error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// API Documentation endpoints
app.get('/api/api-docs', authenticateToken, async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 100);

    let query = 'SELECT id, title, version, summary, created_at, updated_at FROM api_documents';
    let countQuery = 'SELECT COUNT(*) FROM api_documents';
    const params: any[] = [];
    const countParams: any[] = [];

    // Build WHERE conditions for search
    const whereConditions: string[] = [];

    if (search) {
      const searchTerm = String(search).trim().toLowerCase();
      whereConditions.push('(LOWER(title) ILIKE $' + (params.length + 1) + ' OR LOWER(version) ILIKE $' + (params.length + 1) + ')');
      params.push(`%${searchTerm}%`);
      countParams.push(`%${searchTerm}%`);
    }

    // Add WHERE clause if there are conditions
    if (whereConditions.length > 0) {
      const whereClause = ' WHERE ' + whereConditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    query += ' ORDER BY updated_at DESC, id DESC';
    const offset = (pageNumber - 1) * limitNumber;
    query += ` LIMIT ${limitNumber} OFFSET ${offset}`;

    const [docsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    // Format documents response
    const documents = docsResult.rows.map(doc => ({
      id: doc.id,
      title: doc.title,
      version: doc.version,
      summary: doc.summary,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at
    }));

    res.json({
      data: documents,
      meta: {
        total: Number(countResult.rows[0].count),
        page: pageNumber,
        limit: limitNumber
      }
    });
  } catch (error) {
    console.error('Get API docs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/api-docs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM api_documents WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Documentación no encontrada' });
    }

    const document = {
      id: result.rows[0].id,
      title: result.rows[0].title,
      version: result.rows[0].version,
      summary: result.rows[0].summary,
      content: result.rows[0].content,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    };

    res.json(document);
  } catch (error) {
    console.error('Get API doc error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/api-docs', authenticateToken, requireAdmin, async (req: express.Request & { user?: JwtPayload }, res) => {
  try {
    const { title, version, summary, content } = req.body;

    if (!title || !version || !summary || !content) {
      return res.status(400).json({
        message: 'Todos los campos son requeridos: title, version, summary, content'
      });
    }

    // Check for duplicate title+version
    const existingDoc = await pool.query(
      'SELECT id FROM api_documents WHERE title = $1 AND version = $2',
      [title, version]
    );

    if (existingDoc.rows.length > 0) {
      return res.status(409).json({
        message: 'Ya existe una documentación con este título y versión'
      });
    }

    // Create API document
    const result = await pool.query(
      `INSERT INTO api_documents (title, version, summary, content, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [title, version, summary, content]
    );

    const document = {
      id: result.rows[0].id,
      title: result.rows[0].title,
      version: result.rows[0].version,
      summary: result.rows[0].summary,
      content: result.rows[0].content,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    };

    res.status(201).json(document);
  } catch (error) {
    console.error('Create API doc error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/api-docs/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, version, summary, content } = req.body;

    // Check if document exists
    const existingDoc = await pool.query(
      'SELECT id, title, version FROM api_documents WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      return res.status(404).json({ message: 'Documentación no encontrada' });
    }

    // Check for duplicate title+version (if changed)
    if (title && version) {
      const duplicateCheck = await pool.query(
        'SELECT id FROM api_documents WHERE title = $1 AND version = $2 AND id != $3',
        [title, version, id]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({
          message: 'Ya existe una documentación con este título y versión'
        });
      }
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (title) {
      updates.push(`title = $${paramIndex++}`);
      params.push(title);
    }

    if (version) {
      updates.push(`version = $${paramIndex++}`);
      params.push(version);
    }

    if (summary !== undefined) {
      updates.push(`summary = $${paramIndex++}`);
      params.push(summary);
    }

    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      params.push(content);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id); // For WHERE clause

    const result = await pool.query(
      `UPDATE api_documents SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    const document = {
      id: result.rows[0].id,
      title: result.rows[0].title,
      version: result.rows[0].version,
      summary: result.rows[0].summary,
      content: result.rows[0].content,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    };

    res.json(document);
  } catch (error) {
    console.error('Update API doc error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/api-docs/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if document exists
    const existingDoc = await pool.query(
      'SELECT id FROM api_documents WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      return res.status(404).json({ message: 'Documentación no encontrada' });
    }

    await pool.query('DELETE FROM api_documents WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete API doc error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Seed API documentation endpoint
app.post('/api/api-docs/seed', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Check if documentation already exists
    const existingDocs = await pool.query('SELECT COUNT(*) as count FROM api_documents');
    if (parseInt(existingDocs.rows[0].count) > 0) {
      return res.json({ message: 'API documentation already exists' });
    }

    const documentation = [
      {
        title: 'Autenticación',
        version: 'v1.0.0',
        summary: 'Endpoints de autenticación y autorización',
        content: JSON.stringify({
          format: 'swagger-summary',
          module: {
            title: 'Autenticación',
            description: 'Sistema de autenticación de usuarios y gestión de sesiones JWT',
            baseUrl: '/api/auth',
            icon: 'lock'
          },
          endpoints: [
            {
              method: 'POST',
              path: '/api/auth/login',
              summary: 'Iniciar sesión',
              description: 'Autentica un usuario y retorna un token JWT',
              authentication: 'none',
              parameters: [
                { name: 'username', in: 'body', required: true, type: 'string', description: 'Nombre de usuario' },
                { name: 'password', in: 'body', required: true, type: 'string', description: 'Contraseña del usuario' }
              ],
              responses: [
                {
                  status: 200,
                  description: 'Autenticación exitosa',
                  body: {
                    accessToken: 'jwt_token_string',
                    user: {
                      id: 'uuid',
                      username: 'string',
                      role: 'ADMIN|OPERATOR'
                    }
                  }
                },
                { status: 401, description: 'Credenciales inválidas' }
              ]
            },
            {
              method: 'GET',
              path: '/api/auth/me',
              summary: 'Obtener usuario actual',
              description: 'Obtiene información del usuario desde el token JWT',
              authentication: 'bearer',
              responses: [
                {
                  status: 200,
                  description: 'Información del usuario',
                  body: {
                    id: 'uuid',
                    username: 'string',
                    role: 'ADMIN|OPERATOR'
                  }
                }
              ]
            }
          ]
        })
      },
      {
        title: 'Catálogos',
        version: 'v1.0.0',
        summary: 'Catálogos tributarios y datos de referencia del sistema fiscal costarricense',
        content: JSON.stringify({
          format: 'swagger-summary',
          module: {
            title: 'Catálogos',
            description: 'Catálogos tributarios y datos de referencia del sistema fiscal costarricense',
            baseUrl: '/api/catalogs',
            icon: 'list'
          },
          endpoints: [
            {
              method: 'GET',
              path: '/api/catalogs',
              summary: 'Listar catálogos disponibles',
              description: 'Lista todos los catálogos de datos tributarios disponibles',
              authentication: 'bearer',
              responses: [
                {
                  status: 200,
                  description: 'Lista de catálogos disponibles',
                  body: [
                    {
                      key: 'tipos-documento',
                      label: 'Tipos de Documentos',
                      tableName: 'tipos_documento',
                      fields: ['id', 'codigo', 'descripcion', 'created_at', 'updated_at'],
                      uniqueBy: ['codigo'],
                      searchFields: ['descripcion', 'codigo']
                    }
                  ]
                }
              ]
            },
            {
              method: 'GET',
              path: '/api/catalogs/{catalogKey}',
              summary: 'Obtener ítems de catálogo',
              description: 'Obtiene ítems paginados de un catálogo específico',
              authentication: 'bearer',
              parameters: [
                { name: 'catalogKey', in: 'path', required: true, type: 'string', description: 'Clave del catálogo' },
                { name: 'search', in: 'query', required: false, type: 'string', description: 'Término de búsqueda' },
                { name: 'page', in: 'query', required: false, type: 'number', description: 'Número de página (default: 1)' },
                { name: 'limit', in: 'query', required: false, type: 'number', description: 'Ítems por página (default: 50, max: 200)' }
              ],
              responses: [
                {
                  status: 200,
                  description: 'Ítems del catálogo',
                  body: {
                    data: [
                      {
                        id: 'uuid',
                        codigo: 1,
                        descripcion: 'Cédula Física'
                      }
                    ],
                    meta: {
                      total: 50,
                      page: 1,
                      limit: 50
                    }
                  }
                }
              ]
            }
          ]
        })
      },
      {
        title: 'Geografía',
        version: 'v1.0.0',
        summary: 'Datos geográficos de Costa Rica - provincias, cantones, distritos y barrios',
        content: JSON.stringify({
          format: 'swagger-summary',
          module: {
            title: 'Geografía',
            description: 'Datos geográficos de Costa Rica - provincias, cantones, distritos y barrios',
            baseUrl: '/api/geography',
            icon: 'map'
          },
          endpoints: [
            {
              method: 'GET',
              path: '/api/geography/provinces',
              summary: 'Listar provincias',
              description: 'Lista todas las provincias de Costa Rica con paginación y búsqueda',
              authentication: 'bearer',
              parameters: [
                { name: 'search', in: 'query', required: false, type: 'string', description: 'Término de búsqueda' },
                { name: 'page', in: 'query', required: false, type: 'number', description: 'Número de página (default: 1)' },
                { name: 'limit', in: 'query', required: false, type: 'number', description: 'Ítems por página (default: 50, max: 200)' }
              ],
              responses: [
                {
                  status: 200,
                  description: 'Lista de provincias',
                  body: {
                    data: [
                      {
                        id: 'uuid',
                        nombre: 'San José',
                        codigo: 1
                      }
                    ],
                    meta: {
                      total: 7,
                      page: 1,
                      limit: 50
                    }
                  }
                }
              ]
            },
            {
              method: 'GET',
              path: '/api/geography/cantons',
              summary: 'Listar cantones',
              description: 'Lista todos los cantones con filtros opcionales',
              authentication: 'bearer',
              parameters: [
                { name: 'search', in: 'query', required: false, type: 'string', description: 'Término de búsqueda' },
                { name: 'provinceCode', in: 'query', required: false, type: 'number', description: 'Filtrar por código de provincia' },
                { name: 'page', in: 'query', required: false, type: 'number', description: 'Número de página' },
                { name: 'limit', in: 'query', required: false, type: 'number', description: 'Ítems por página' }
              ]
            }
          ]
        })
      },
      {
        title: 'Usuarios',
        version: 'v1.0.0',
        summary: 'Sistema de gestión de usuarios para administradores',
        content: JSON.stringify({
          format: 'swagger-summary',
          module: {
            title: 'Usuarios',
            description: 'Sistema de gestión de usuarios para administradores',
            baseUrl: '/api/users',
            icon: 'users'
          },
          endpoints: [
            {
              method: 'GET',
              path: '/api/users',
              summary: 'Listar usuarios',
              description: 'Lista todos los usuarios con paginación y búsqueda (solo administradores)',
              authentication: 'bearer',
              parameters: [
                { name: 'search', in: 'query', required: false, type: 'string', description: 'Buscar por nombre de usuario' },
                { name: 'page', in: 'query', required: false, type: 'number', description: 'Número de página (default: 1)' },
                { name: 'limit', in: 'query', required: false, type: 'number', description: 'Ítems por página (default: 20, max: 100)' }
              ],
              responses: [
                {
                  status: 200,
                  description: 'Lista de usuarios',
                  body: {
                    data: [
                      {
                        id: 'uuid',
                        username: 'admin',
                        role: 'ADMIN',
                        isActive: true
                      }
                    ],
                    meta: {
                      total: 1,
                      page: 1,
                      limit: 20
                    }
                  }
                }
              ]
            },
            {
              method: 'POST',
              path: '/api/users',
              summary: 'Crear usuario',
              description: 'Crea un nuevo usuario (solo administradores)',
              authentication: 'bearer',
              parameters: [
                { name: 'username', in: 'body', required: true, type: 'string', description: 'Nombre de usuario' },
                { name: 'password', in: 'body', required: true, type: 'string', description: 'Contraseña del usuario' },
                { name: 'role', in: 'body', required: true, type: 'string', description: 'Rol del usuario (ADMIN|OPERATOR)' },
                { name: 'isActive', in: 'body', required: true, type: 'boolean', description: 'Estado del usuario' }
              ],
              responses: [
                {
                  status: 201,
                  description: 'Usuario creado exitosamente'
                },
                { status: 409, description: 'Nombre de usuario ya existe' }
              ]
            }
          ]
        })
      },
      {
        title: 'Documentación API',
        version: 'v1.0.0',
        summary: 'Sistema auto-documentado para integraciones externas',
        content: JSON.stringify({
          format: 'swagger-summary',
          module: {
            title: 'Documentación de API',
            description: 'Sistema de documentación auto-contenida para facilitar integraciones externas',
            baseUrl: '/api/api-docs',
            icon: 'book'
          },
          endpoints: [
            {
              method: 'GET',
              path: '/api/api-docs',
              summary: 'Listar documentación',
              description: 'Lista toda la documentación de API disponible',
              authentication: 'bearer',
              responses: [
                {
                  status: 200,
                  description: 'Lista de documentación',
                  body: {
                    data: [
                      {
                        id: 'uuid',
                        title: 'Autenticación',
                        version: 'v1.0.0',
                        summary: 'Sistema de autenticación de usuarios'
                      }
                    ],
                    meta: {
                      total: 5,
                      page: 1,
                      limit: 20
                    }
                  }
                }
              ]
            },
            {
              method: 'GET',
              path: '/api/api-docs/{id}',
              summary: 'Obtener documentación específica',
              description: 'Obtiene documentación completa para una API específica',
              authentication: 'bearer',
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'string', description: 'ID del documento' }
              ]
            },
            {
              method: 'POST',
              path: '/api/api-docs',
              summary: 'Crear documentación',
              description: 'Crea nueva documentación de API (solo administradores)',
              authentication: 'bearer',
              parameters: [
                { name: 'title', in: 'body', required: true, type: 'string', description: 'Título del documento' },
                { name: 'version', in: 'body', required: true, type: 'string', description: 'Versión' },
                { name: 'summary', in: 'body', required: true, type: 'string', description: 'Resumen' },
                { name: 'content', in: 'body', required: true, type: 'string', description: 'Contenido completo' }
              ]
            }
          ]
        })
      }
    ];

    for (const doc of documentation) {
      await pool.query(
        `INSERT INTO api_documents (title, version, summary, content, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [doc.title, doc.version, doc.summary, doc.content]
      );
    }

    res.json({
      message: 'API documentation seeded successfully',
      documentsInserted: documentation.length,
      documents: documentation.map(d => ({ title: d.title, version: d.version }))
    });
  } catch (error) {
    console.error('Seed API docs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Import geography data from Excel
app.post('/api/geography/:table/import', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { table } = req.params;

    // Validate table name
    const validTables = ['provinces', 'cantons', 'districts', 'barrios'];
    if (!validTables.includes(table)) {
      return res.status(404).json({
        message: 'Table not found',
        validTables: validTables
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty or invalid format' });
    }

    // Validate required columns based on table
    const firstRow = jsonData[0] as any;
    const tableName = table === 'provinces' ? 'provincias' :
                    table === 'cantons' ? 'cantones' :
                    table === 'districts' ? 'distritos' : 'barrios';

    let requiredColumns: string[] = [];
    let validationFunction: (row: any, i: number) => { isValid: boolean; data: any; error?: string };

    // Default validation function (should never be reached)
    validationFunction = () => ({ isValid: false, error: 'Invalid table', data: null });

    if (table === 'provinces') {
      requiredColumns = ['nombre', 'codigo'];
      validationFunction = (row: any, i: number) => {
        const codigo = row.codigo || row.codigo_provincia || row.codigoProvincia || row.provinceCode || row.province_code;
        const nombre = row.nombre || row.nombre_provincia || row.provinceName || row.province_name || row.province_name;

        if (!codigo || codigo.toString().trim() === '') {
          return { isValid: false, error: `Row ${i + 2}: codigo is required`, data: null };
        }
        if (!nombre || nombre.toString().trim() === '') {
          return { isValid: false, error: `Row ${i + 2}: nombre is required`, data: null };
        }

        return {
          isValid: true,
          data: {
            codigo: parseInt(codigo.toString().trim()),
            nombre: nombre.toString().trim()
          }
        };
      };
    } else if (table === 'cantons') {
      requiredColumns = ['provincia', 'codigo_provincia', 'canton', 'codigo_canton'];
      validationFunction = (row: any, i: number) => {
        const provincia = row.provincia || row.provincia_nombre || row.province_name || row.provincia;
        const codigo_provincia = row.codigo_provincia || row.codigoProvincia || row.province_code || row.provinceCode || row.codigo;
        const canton = row.canton || row.canton_nombre || row.canton_name || row.nombre || row.nombre_canton;
        const codigo_canton = row.codigo_canton || row.codigoCanton || row.canton_code || row.cantonCode;

        if (!provincia || provincia.toString().trim() === '') {
          return { isValid: false, error: `Row ${i + 2}: provincia is required`, data: null };
        }
        if (!codigo_provincia || codigo_provincia.toString().trim() === '') {
          return { isValid: false, error: `Row ${i + 2}: codigo_provincia is required`, data: null };
        }
        if (!canton || canton.toString().trim() === '') {
          return { isValid: false, error: `Row ${i + 2}: canton is required`, data: null };
        }
        if (!codigo_canton || codigo_canton.toString().trim() === '') {
          return { isValid: false, error: `Row ${i + 2}: codigo_canton is required`, data: null };
        }

        return {
          isValid: true,
          data: {
            provincia: provincia.toString().trim(),
            codigo_provincia: parseInt(codigo_provincia.toString().trim()),
            canton: canton.toString().trim(),
            codigo_canton: codigo_canton.toString().trim()
          }
        };
      };
    } else if (table === 'districts') {
      requiredColumns = ['province_code', 'canton_code', 'district_code', 'district_name'];
      validationFunction = (row: any, i: number) => {
        const province_code = row.province_code || row.codigo_provincia || row.codigoProvincia || row.provinceCode || row.codigo;
        const canton_code = row.canton_code || row.codigo_canton || row.codigoCanton || row.cantonCode;
        const district_code = row.district_code || row.codigo_distrito || row.codigoDistrito || row.districtCode;
        const district_name = row.district_name || row.nombre || row.nombre_distrito || row.districtName;

        if (!province_code || province_code.toString().trim() === '') {
          return { isValid: false, error: `Row ${i + 2}: province_code is required`, data: null };
        }
        if (!canton_code || canton_code.toString().trim() === '') {
          return { isValid: false, error: `Row ${i + 2}: canton_code is required`, data: null };
        }
        if (!district_code || district_code.toString().trim() === '') {
          return { isValid: false, error: `Row ${i + 2}: district_code is required`, data: null };
        }
        if (!district_name || district_name.toString().trim() === '') {
          return { isValid: false, error: `Row ${i + 2}: district_name is required`, data: null };
        }

        return {
          isValid: true,
          data: {
            province_code: parseInt(province_code.toString().trim()),
            canton_code: canton_code.toString().trim(),
            district_code: district_code.toString().trim(),
            district_name: district_name.toString().trim()
          }
        };
      };
    } else if (table === 'barrios') {
      requiredColumns = ['province_code', 'canton_code', 'district_code', 'barrio_name'];
      validationFunction = (row: any, i: number) => {
        const province_code = row.province_code || row.codigo_provincia || row.codigoProvincia || row.provinceCode || row.codigo;
        const canton_code = row.canton_code || row.codigo_canton || row.codigoCanton || row.cantonCode;
        const district_code = row.district_code || row.codigo_distrito || row.codigoDistrito || row.districtCode;
        const barrio_name = row.barrio_name || row.nombre || row.nombre_barrio || row.barrioName;

        if (!province_code || province_code.toString().trim() === '') {
          return { isValid: false, error: `Row ${i + 2}: province_code is required`, data: null };
        }
        if (!canton_code || canton_code.toString().trim() === '') {
          return { isValid: false, error: `Row ${i + 2}: canton_code is required`, data: null };
        }
        if (!district_code || district_code.toString().trim() === '') {
          return { isValid: false, error: `Row ${i + 2}: district_code is required`, data: null };
        }
        if (!barrio_name || barrio_name.toString().trim() === '') {
          return { isValid: false, error: `Row ${i + 2}: barrio_name is required`, data: null };
        }

        return {
          isValid: true,
          data: {
            province_code: parseInt(province_code.toString().trim()),
            canton_code: canton_code.toString().trim(),
            district_code: district_code.toString().trim(),
            barrio_name: barrio_name.toString().trim()
          }
        };
      };
    }

    let insertedCount = 0;
    let skippedCount = 0;
    const errors = [];

    // Process each row
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as any;

      try {
        const validation = validationFunction(row, i);

        if (!validation.isValid) {
          (errors as string[]).push(validation.error || `Row ${i + 2}: Validation failed`);
          skippedCount++;
          continue;
        }

        const data = validation.data;

        // Check if record already exists (based on unique constraints)
        let checkQuery: string;
        let checkParams: any[];

        if (table === 'provinces') {
          checkQuery = `SELECT id FROM ${tableName} WHERE codigo = $1`;
          checkParams = [data.codigo];
        } else if (table === 'cantons') {
          checkQuery = `SELECT id FROM ${tableName} WHERE codigo_provincia = $1 AND codigo_canton = $2`;
          checkParams = [data.codigo_provincia, data.codigo_canton];
        } else if (table === 'districts') {
          checkQuery = `SELECT id FROM ${tableName} WHERE province_code = $1 AND canton_code = $2 AND district_code = $3`;
          checkParams = [data.province_code, data.canton_code, data.district_code];
        } else {
          checkQuery = `SELECT id FROM ${tableName} WHERE province_code = $1 AND canton_code = $2 AND district_code = $3 AND barrio_name = $4`;
          checkParams = [data.province_code, data.canton_code, data.district_code, data.barrio_name];
        }

        const existingItem = await pool.query(checkQuery, checkParams);

        if (existingItem.rows.length > 0) {
          skippedCount++;
          continue;
        }

        // Insert the new record
        const fields = Object.keys(data);
        const values = Object.values(data);
        const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');

        const insertQuery = `
          INSERT INTO ${tableName} (${fields.join(', ')}, created_at, updated_at)
          VALUES (${placeholders}, NOW(), NOW())
          RETURNING *
        `;

        await pool.query(insertQuery, values);
        insertedCount++;

      } catch (rowError) {
        console.error(`Error processing row ${i + 2}:`, rowError);
        (errors as string[]).push(`Row ${i + 2}: ${rowError.message}`);
        skippedCount++;
      }
    }

    res.json({
      message: 'Geography import completed',
      summary: {
        total: jsonData.length,
        inserted: insertedCount,
        skipped: skippedCount,
        errors: errors.length
      },
      errors: errors
    });

  } catch (error) {
    console.error('Geography import error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Diagnostic endpoint to check current table structure
app.get('/api/diagnostic/table/:tableName', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { tableName } = req.params;

    const tableStructure = await pool.query(`
      SELECT column_name, data_type, numeric_precision, numeric_scale, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName]);

    if (tableStructure.rows.length === 0) {
      return res.status(404).json({
        message: 'Table not found',
        tableName: tableName
      });
    }

    res.json({
      tableName: tableName,
      columns: tableStructure.rows,
      columnCount: tableStructure.rows.length
    });

  } catch (error) {
    console.error('Diagnostic error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Diagnostic endpoint to check cantones data transformation
app.get('/api/diagnostic/cantones-data', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('Diagnostic: Getting raw cantones data...');

    // Get raw data from database
    const rawResult = await pool.query('SELECT * FROM cantones LIMIT 3');

    console.log('Raw data from database:', rawResult.rows);

    // Get transformed data
    const transformedData = rawResult.rows.map(row => transformRowKeys(row));

    console.log('Transformed data for frontend:', transformedData);

    // Also show individual transformations
    const transformations = rawResult.rows.map(row => {
      const transformed: any = {};
      for (const key in row) {
        transformed[key] = row[key];
        transformed[toCamelCase(key)] = row[key];
      }
      return transformed;
    });

    res.json({
      message: 'Cantones data diagnostic',
      rawData: rawResult.rows,
      transformedData: transformedData,
      transformations: transformations,
      camelCaseMappings: Object.keys(rawResult.rows[0] || {}).map(key => ({
        original: key,
        camelCase: toCamelCase(key)
      }))
    });

  } catch (error) {
    console.error('Cantones diagnostic error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Simple raw data endpoint for cantones (no transformation)
app.get('/api/diagnostic/cantones-raw', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('Getting raw cantones data...');
    const result = await pool.query('SELECT * FROM cantones LIMIT 3');
    console.log('Raw cantones data:', result.rows);
    res.json({
      message: 'Raw cantones data',
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Raw cantones data error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Special endpoint to transform cantones table structure
app.post('/api/schemas/transform-cantones', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('Starting cantones table transformation...');

    const operations = [
      // 1. Add new columns if they don't exist
      {
        description: 'Add new columns if they don\'t exist',
        sql: `
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cantones' AND column_name = 'provincia') THEN
              ALTER TABLE cantones ADD COLUMN provincia VARCHAR(120);
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cantones' AND column_name = 'codigo_provincia') THEN
              ALTER TABLE cantones ADD COLUMN codigo_provincia INTEGER;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cantones' AND column_name = 'canton') THEN
              ALTER TABLE cantones ADD COLUMN canton VARCHAR(120);
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cantones' AND column_name = 'codigo_canton') THEN
              ALTER TABLE cantones ADD COLUMN codigo_canton VARCHAR(50);
            END IF;
          END $$;
        `
      },

      // 2. Copy data from old columns to new columns
      {
        description: 'Copy data from old columns to new columns',
        sql: `
          UPDATE cantones SET
            provincia = COALESCE(provincia_nombre, 'Unknown'),
            codigo_provincia = COALESCE(province_code, 0),
            canton = COALESCE(nombre, 'Unknown'),
            codigo_canton = COALESCE(codigo, '00');
        `
      },

      // 3. Make new columns NOT NULL after data is copied
      {
        description: 'Set new columns as NOT NULL',
        sql: `
          ALTER TABLE cantones
            ALTER COLUMN provincia SET NOT NULL,
            ALTER COLUMN codigo_provincia SET NOT NULL,
            ALTER COLUMN canton SET NOT NULL,
            ALTER COLUMN codigo_canton SET NOT NULL;
        `
      },

      // 4. Create unique constraint on new columns
      {
        description: 'Add unique constraint on codigo_provincia and codigo_canton',
        sql: `
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                          WHERE table_name = 'cantones' AND constraint_name = 'cantones_codigo_provincia_codigo_canton_key') THEN
              ALTER TABLE cantones ADD CONSTRAINT cantones_codigo_provincia_codigo_canton_key
                UNIQUE (codigo_provincia, codigo_canton);
            END IF;
          END $$;
        `
      }
    ];

    const results: any[] = [];

    for (const operation of operations) {
      try {
        console.log(`Executing: ${operation.description}`);
        await pool.query(operation.sql);

        results.push({
          description: operation.description,
          status: 'success'
        });

        console.log(`✅ Success: ${operation.description}`);

      } catch (error) {
        console.error(`❌ Error in ${operation.description}:`, error);
        results.push({
          description: operation.description,
          status: 'error',
          error: error.message
        });
      }
    }

    // 5. Drop old columns (optional - keep them as backup for now)
    console.log('Transformation completed. Old columns kept as backup.');

    res.json({
      message: 'Cantones table transformation completed',
      operations: results,
      summary: {
        total: operations.length,
        success: results.filter(r => r.status === 'success').length,
        errors: results.filter(r => r.status === 'error').length
      },
      note: 'Old columns (provincia_nombre, province_code, nombre, codigo) have been kept as backup. You can manually drop them if needed.'
    });

  } catch (error) {
    console.error('Cantones transformation error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Special endpoint to transform distritos table structure
app.post('/api/schemas/transform-distritos', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('Starting distritos table transformation...');

    const operations = [
      // 1. Add new columns if they don't exist
      {
        description: 'Add new columns if they don\'t exist',
        sql: `
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'distritos' AND column_name = 'provincia') THEN
              ALTER TABLE distritos ADD COLUMN provincia VARCHAR(120);
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'distritos' AND column_name = 'codigo_provincia') THEN
              ALTER TABLE distritos ADD COLUMN codigo_provincia INTEGER;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'distritos' AND column_name = 'canton') THEN
              ALTER TABLE distritos ADD COLUMN canton VARCHAR(120);
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'distritos' AND column_name = 'codigo_canton') THEN
              ALTER TABLE distritos ADD COLUMN codigo_canton VARCHAR(50);
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'distritos' AND column_name = 'distrito') THEN
              ALTER TABLE distritos ADD COLUMN distrito VARCHAR(120);
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'distritos' AND column_name = 'codigo_distrito') THEN
              ALTER TABLE distritos ADD COLUMN codigo_distrito VARCHAR(50);
            END IF;
          END $$;
        `
      },

      // 2. Copy data from old columns to new columns
      {
        description: 'Copy data from old columns to new columns',
        sql: `
          UPDATE distritos SET
            provincia = COALESCE(provincia_nombre, 'Unknown'),
            codigo_provincia = COALESCE(province_code, 0),
            canton = COALESCE(canton_nombre, 'Unknown'),
            codigo_canton = COALESCE(canton_code, '00'),
            distrito = COALESCE(nombre, 'Unknown'),
            codigo_distrito = COALESCE(codigo, '00');
        `
      },

      // 3. Make new columns NOT NULL after data is copied
      {
        description: 'Set new columns as NOT NULL',
        sql: `
          ALTER TABLE distritos
            ALTER COLUMN provincia SET NOT NULL,
            ALTER COLUMN codigo_provincia SET NOT NULL,
            ALTER COLUMN canton SET NOT NULL,
            ALTER COLUMN codigo_canton SET NOT NULL,
            ALTER COLUMN distrito SET NOT NULL,
            ALTER COLUMN codigo_distrito SET NOT NULL;
        `
      },

      // 4. Create unique constraint on new columns
      {
        description: 'Add unique constraint on codigo_provincia, codigo_canton, codigo_distrito',
        sql: `
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                          WHERE table_name = 'distritos' AND constraint_name = 'distritos_codigo_provincia_codigo_canton_codigo_distrito_key') THEN
              ALTER TABLE distritos ADD CONSTRAINT distritos_codigo_provincia_codigo_canton_codigo_distrito_key
                UNIQUE (codigo_provincia, codigo_canton, codigo_distrito);
            END IF;
          END $$;
        `
      }
    ];

    const results: any[] = [];

    for (const operation of operations) {
      try {
        console.log(`Executing: ${operation.description}`);
        await pool.query(operation.sql);

        results.push({
          description: operation.description,
          status: 'success'
        });

        console.log(`✅ Success: ${operation.description}`);

      } catch (error) {
        console.error(`❌ Error in ${operation.description}:`, error);
        results.push({
          description: operation.description,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log('Transformation completed. Old columns kept as backup.');

    res.json({
      message: 'Distritos table transformation completed',
      operations: results,
      summary: {
        total: operations.length,
        success: results.filter(r => r.status === 'success').length,
        errors: results.filter(r => r.status === 'error').length
      },
      note: 'Old columns (provincia_nombre, province_code, canton_nombre, canton_code, nombre, codigo) have been kept as backup. You can manually drop them if needed.'
    });

  } catch (error) {
    console.error('Distritos transformation error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Export for Vercel
export default app;