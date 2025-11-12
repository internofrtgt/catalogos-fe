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
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token required' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Middleware to check admin role
function requireAdmin(req: any, res: any, next: any) {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin role required' });
  }
  next();
}

// Catalog definitions (simplified version from the original)
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
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'actividades-economicas',
    label: 'Actividades Económicas',
    tableName: 'actividades_economicas',
    fields: [
      { name: 'codigo', type: 'numeric', required: true },
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
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true },
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
      { name: 'codigo', type: 'numeric', required: true },
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
    key: 'unidades-medida',
    label: 'Unidades de Medida',
    tableName: 'unidades_medida',
    fields: [
      { name: 'unidad', type: 'string', required: true },
      { name: 'simbolo', type: 'string', required: true },
      { name: 'tipoUnidad', type: 'string', required: true },
    ],
    uniqueBy: ['unidad'],
    searchFields: ['unidad', 'simbolo', 'tipoUnidad'],
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

// Initialize tables on startup
initializeCatalogTables();

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
    const { search, page = 1, limit = 10 } = req.query;

    const definition = catalogDefinitionsMap.get(catalogKey);
    if (!definition) {
      return res.status(404).json({ message: 'Catalog not found' });
    }

    let query = `SELECT * FROM ${definition.tableName}`;
    const params: any[] = [];

    if (search) {
      const searchConditions = definition.searchFields.map((field: string, index: number) => {
        return `${field} ILIKE $${index + 1}`;
      });
      query += ` WHERE ${searchConditions.join(' OR ')}`;
      params.push(...definition.searchFields.map(() => `%${search}%`));
    }

    query += ` ORDER BY created_at DESC`;

    const offset = (Number(page) - 1) * Number(limit);
    query += ` LIMIT ${Number(limit)} OFFSET ${offset}`;

    const countQuery = search
      ? `SELECT COUNT(*) FROM ${definition.tableName} WHERE ${definition.searchFields.map((field: string, index: number) => `${field} ILIKE $${index + 1}`).join(' OR ')}`
      : `SELECT COUNT(*) FROM ${definition.tableName}`;

    const [itemsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params)
    ]);

    res.json({
      items: itemsResult.rows,
      total: Number(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(Number(countResult.rows[0].count) / Number(limit))
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

// Export for Vercel
export default app;