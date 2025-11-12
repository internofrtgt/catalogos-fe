import express from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());

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

// Complete catalog definitions from original file
const catalogDefinitions: any[] = [
  {
    key: 'tipos-documento',
    label: 'Tipos de Documentos',
    tableName: 'tipos_documento',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'int', required: true },
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
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'actividades-economicas',
    label: 'Actividades Económicas',
    tableName: 'actividades_economicas',
    fields: [
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
      { name: 'nombre', type: 'string', required: true },
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
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-identificacion',
    label: 'Tipos de Identificación',
    tableName: 'tipos_identificacion',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'formas-farmaceuticas',
    label: 'Formas Farmacéuticas',
    tableName: 'formas_farmaceuticas',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'int', required: true },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-codigo-ps',
    label: 'Tipos de Código para P o S',
    tableName: 'tipos_codigo_ps',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
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
        length: 120,
      },
      {
        name: 'simbolo',
        type: 'string',
        required: true,
        length: 30,
      },
      {
        name: 'tipoUnidad',
        type: 'string',
        required: true,
        length: 120,
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
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-descuento',
    label: 'Tipos de Descuento',
    tableName: 'tipos_descuento',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'int', required: true },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-impuestos',
    label: 'Tipos de Impuestos',
    tableName: 'tipos_impuestos',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tarifas-iva',
    label: 'Tarifas de IVA',
    tableName: 'tarifas_iva',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'int', required: true },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-documento-exoneracion',
    label: 'Tipos de Documento de Exoneración',
    tableName: 'tipos_documento_exoneracion',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'instituciones-exoneracion',
    label: 'Instituciones o Dep. Emisoras de Exoneración',
    tableName: 'instituciones_exoneracion',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'int', required: true },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-otros-cargos',
    label: 'Tipos de Otros Cargos',
    tableName: 'tipos_otros_cargos',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'int', required: true },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'codigos-moneda',
    label: 'Códigos de Moneda',
    tableName: 'codigos_moneda',
    fields: [
      { name: 'pais', type: 'string', required: true, length: 120 },
      { name: 'moneda', type: 'string', required: true, length: 120 },
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
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-documento-referencia',
    label: 'Tipos de Documento de Referencia',
    tableName: 'tipos_documento_referencia',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'codigos-referencia',
    label: 'Códigos de Referencia',
    tableName: 'codigos_referencia',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'mensajes-recepcion',
    label: 'Mensajes de Recepción',
    tableName: 'mensajes_recepcion',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'condiciones-impuesto',
    label: 'Condiciones de Impuesto',
    tableName: 'condiciones_impuesto',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
];

const catalogDefinitionsMap = new Map(
  catalogDefinitions.map((def) => [def.key, def]),
);

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

    // Format response to match original NestJS API structure
    res.json({
      data: itemsResult.rows,
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

    res.json(result.rows[0]);
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
    res.status(201).json(result.rows[0]);
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

    res.json(result.rows[0]);
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
      whereConditions.push('province_code = $' + (params.length + 1));
      params.push(provinceCode);
      countParams.push(provinceCode);
    }

    if (search) {
      const searchConditions = [
        'CAST(nombre AS TEXT) ILIKE $' + (params.length + 1),
        'CAST(codigo AS TEXT) ILIKE $' + (params.length + 1),
        'CAST(provincia_nombre AS TEXT) ILIKE $' + (params.length + 1)
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

    query += ' ORDER BY province_code ASC, codigo ASC';
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

    let query = 'SELECT * FROM cantones WHERE province_code = $1';
    const params: any[] = [provinceCode];

    if (search) {
      query += ' AND (CAST(nombre AS TEXT) ILIKE $2 OR CAST(codigo AS TEXT) ILIKE $2 OR CAST(provincia_nombre AS TEXT) ILIKE $2)';
      params.push(`%${search}%`);
    }

    const countQuery = search
      ? `SELECT COUNT(*) FROM cantones WHERE province_code = $1 AND (CAST(nombre AS TEXT) ILIKE $2 OR CAST(codigo AS TEXT) ILIKE $2 OR CAST(provincia_nombre AS TEXT) ILIKE $2)`
      : 'SELECT COUNT(*) FROM cantones WHERE province_code = $1';

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

// Export for Vercel
export default app;