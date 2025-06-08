import { promises as fs } from 'fs';
import path from 'path';
import { TemplateEngine, type TemplateContext } from './template-engine';
import type { RepositoryConfig } from '@shared/schema';
import JSZip from 'jszip';

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'text' | 'binary';
}

export interface RepositoryStructure {
  name: string;
  files: GeneratedFile[];
  totalSize: number;
  moduleCount: number;
  exampleCount: number;
}

export class RepositoryBuilder {
  private templateEngine: TemplateEngine;

  constructor() {
    this.templateEngine = new TemplateEngine();
  }

  async buildRepository(config: RepositoryConfig): Promise<RepositoryStructure> {
    const modules = this.templateEngine.getModules(config);
    const datasets = this.templateEngine.getDatasets(config);
    
    const context: TemplateContext = {
      config,
      modules,
      datasets,
      timestamp: new Date().toISOString(),
      version: "2.1.0"
    };

    const files: GeneratedFile[] = [];

    // Generate root files
    files.push(...await this.generateRootFiles(context));

    // Generate module files
    for (const module of modules) {
      files.push(...await this.generateModuleFiles(module, context));
    }

    // Generate API examples if requested
    if (config.includeAPI) {
      files.push(...await this.generateAPIFiles(context));
    }

    // Generate CI/CD files if requested
    if (config.includeCI) {
      files.push(...await this.generateCIFiles(context));
    }

    // Generate dataset files
    files.push(...await this.generateDatasetFiles(context));

    const totalSize = files.reduce((sum, file) => sum + file.content.length, 0);
    const exampleCount = files.filter(f => f.path.includes('example') || f.path.includes('.py') || f.path.includes('.sql')).length;

    return {
      name: config.repositoryName,
      files,
      totalSize,
      moduleCount: modules.length,
      exampleCount
    };
  }

  async generateZip(structure: RepositoryStructure): Promise<Buffer> {
    const zip = new JSZip();

    for (const file of structure.files) {
      zip.file(file.path, file.content);
    }

    return await zip.generateAsync({ type: 'nodebuffer' });
  }

  private async generateRootFiles(context: TemplateContext): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // README.md
    const readme = await this.templateEngine.renderTemplate('readme.mustache', context);
    files.push({
      path: 'README.md',
      content: readme,
      type: 'text'
    });

    // docker-compose.yml
    const dockerCompose = await this.templateEngine.renderTemplate('docker-compose.mustache', context);
    files.push({
      path: 'docker-compose.yml',
      content: dockerCompose,
      type: 'text'
    });

    // .gitignore
    files.push({
      path: '.gitignore',
      content: this.generateGitignore(),
      type: 'text'
    });

    // requirements.txt or package.json based on language
    if (context.config.language === 'python' || context.config.language === 'multiple') {
      files.push({
        path: 'requirements.txt',
        content: this.generatePythonRequirements(),
        type: 'text'
      });
    }

    if (context.config.language === 'nodejs' || context.config.language === 'multiple') {
      files.push({
        path: 'package.json',
        content: this.generatePackageJson(context),
        type: 'text'
      });
    }

    return files;
  }

  private async generateModuleFiles(module: any, context: TemplateContext): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Module README
    files.push({
      path: `${module.id}/README.md`,
      content: this.generateModuleReadme(module, context),
      type: 'text'
    });

    // SQL setup file
    const setupSql = await this.templateEngine.renderTemplate('setup.sql.mustache', { ...context, module });
    files.push({
      path: `${module.id}/setup.sql`,
      content: setupSql,
      type: 'text'
    });

    // Python example if applicable
    if (context.config.language === 'python' || context.config.language === 'multiple') {
      const pythonExample = await this.templateEngine.renderTemplate('python-example.mustache', { ...context, module });
      files.push({
        path: `${module.id}/examples.py`,
        content: pythonExample,
        type: 'text'
      });
    }

    // Exercises file
    files.push({
      path: `${module.id}/exercises.md`,
      content: this.generateExercises(module, context),
      type: 'text'
    });

    return files;
  }

  private async generateAPIFiles(context: TemplateContext): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    if (context.config.language === 'python' || context.config.language === 'multiple') {
      files.push({
        path: 'api-examples/flask_routing_api.py',
        content: this.generateFlaskAPI(context),
        type: 'text'
      });
    }

    if (context.config.language === 'nodejs' || context.config.language === 'multiple') {
      files.push({
        path: 'api-examples/express_routing_api.js',
        content: this.generateExpressAPI(context),
        type: 'text'
      });
    }

    return files;
  }

  private async generateCIFiles(context: TemplateContext): Promise<GeneratedFile[]> {
    return [
      {
        path: '.github/workflows/ci.yml',
        content: this.generateGitHubActions(context),
        type: 'text'
      }
    ];
  }

  private async generateDatasetFiles(context: TemplateContext): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate sample dataset files
    files.push({
      path: 'datasets/README.md',
      content: this.generateDatasetReadme(context),
      type: 'text'
    });

    files.push({
      path: 'datasets/sample_road_network.geojson',
      content: this.generateSampleGeoJSON(),
      type: 'text'
    });

    files.push({
      path: 'datasets/sample_pois.csv',
      content: this.generateSampleCSV(),
      type: 'text'
    });

    return files;
  }

  private generateGitignore(): string {
    return `# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.*.local

# Database
*.db
*.sqlite3

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`;
  }

  private generatePythonRequirements(): string {
    return `psycopg2-binary==2.9.7
flask==2.3.3
sqlalchemy==2.0.21
geoalchemy2==0.14.1
shapely==2.0.1
fiona==1.9.4
geopandas==0.13.2
folium==0.14.0
requests==2.31.0
pytest==7.4.2
`;
  }

  private generatePackageJson(context: TemplateContext): string {
    return JSON.stringify({
      name: context.config.repositoryName,
      version: "1.0.0",
      description: "pg_route and PostGIS learning repository",
      main: "index.js",
      scripts: {
        start: "node api-examples/express_routing_api.js",
        test: "jest",
        dev: "nodemon api-examples/express_routing_api.js"
      },
      dependencies: {
        express: "^4.18.2",
        pg: "^8.11.3",
        cors: "^2.8.5",
        helmet: "^7.0.0"
      },
      devDependencies: {
        nodemon: "^3.0.1",
        jest: "^29.7.0"
      }
    }, null, 2);
  }

  private generateModuleReadme(module: any, context: TemplateContext): string {
    return `# ${module.name}

${module.description}

## Learning Objectives

By the end of this module, you will be able to:
- Understand the core concepts covered in this module
- Apply the techniques in real-world scenarios
- Complete the practical exercises successfully

## Prerequisites

- PostgreSQL ${context.config.databaseVersion} installed
- PostGIS extension enabled
- Basic SQL knowledge

## Files in this Module

${module.files.map((file: string) => `- \`${file}\` - ${this.getFileDescription(file)}`).join('\n')}

## Getting Started

1. Run the setup script: \`psql -f setup.sql\`
2. Review the examples in the code files
3. Complete the exercises in \`exercises.md\`

## Estimated Time

${module.estimatedHours} hours

## Next Steps

After completing this module, proceed to the next module in the learning path.
`;
  }

  private getFileDescription(filename: string): string {
    const descriptions: { [key: string]: string } = {
      'setup.sql': 'Database setup and schema creation',
      'examples.py': 'Python code examples and demonstrations',
      'exercises.md': 'Hands-on exercises and challenges',
      'README.md': 'Module overview and instructions'
    };
    return descriptions[filename] || 'Supporting file';
  }

  private generateExercises(module: any, context: TemplateContext): string {
    return `# ${module.name} - Exercises

## Exercise 1: Basic Setup
Set up the database environment and verify the installation.

**Tasks:**
1. Create a new database for this module
2. Enable PostGIS and pgRouting extensions
3. Verify the installation by running basic queries

## Exercise 2: Data Import
Import sample data and create necessary indexes.

**Tasks:**
1. Import the provided sample datasets
2. Create spatial indexes for performance
3. Validate the data quality

## Exercise 3: Basic Queries
Write SQL queries to explore the spatial data.

**Tasks:**
1. Find all features within a specific area
2. Calculate distances between points
3. Perform basic spatial joins

## Solutions
Solutions are available in the \`solutions/\` directory. Try to complete the exercises before checking the solutions.

## Additional Challenges
For advanced learners, try these additional challenges:
- Optimize query performance
- Create custom functions
- Implement error handling
`;
  }

  private generateFlaskAPI(context: TemplateContext): string {
    return `#!/usr/bin/env python3
"""
Flask API for PostGIS and pgRouting operations
Generated for: ${context.config.repositoryName}
"""

from flask import Flask, request, jsonify
import psycopg2
import json
from psycopg2.extras import RealDictCursor

app = Flask(__name__)

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'database': 'pgrouting_db',
    'user': 'postgres',
    'password': 'password',
    'port': 5432
}

class RoutingService:
    def __init__(self):
        self.conn = psycopg2.connect(**DB_CONFIG)
    
    def find_shortest_path(self, start_lat, start_lon, end_lat, end_lon):
        """Find shortest path between two points using pgRouting"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cursor:
            query = """
            WITH start_node AS (
                SELECT id, ST_Distance(geom, ST_SetSRID(ST_Point(%s, %s), 4326)) as dist
                FROM routing.nodes
                ORDER BY dist LIMIT 1
            ),
            end_node AS (
                SELECT id, ST_Distance(geom, ST_SetSRID(ST_Point(%s, %s), 4326)) as dist
                FROM routing.nodes
                ORDER BY dist LIMIT 1
            )
            SELECT 
                r.name,
                r.cost,
                ST_AsGeoJSON(r.geom) as geometry,
                p.seq
            FROM pgr_dijkstra(
                'SELECT id, source, target, cost FROM routing.roads',
                (SELECT id FROM start_node),
                (SELECT id FROM end_node)
            ) p
            JOIN routing.roads r ON p.edge = r.id
            ORDER BY p.seq;
            """
            
            cursor.execute(query, (start_lon, start_lat, end_lon, end_lat))
            return cursor.fetchall()

routing_service = RoutingService()

@app.route('/api/route', methods=['POST'])
def calculate_route():
    """Calculate shortest route between two points"""
    try:
        data = request.get_json()
        start_lat = data['start_lat']
        start_lon = data['start_lon']
        end_lat = data['end_lat']
        end_lon = data['end_lon']
        
        route = routing_service.find_shortest_path(start_lat, start_lon, end_lat, end_lon)
        
        return jsonify({
            'status': 'success',
            'route': route,
            'total_segments': len(route)
        })
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'pgRouting API'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
`;
  }

  private generateExpressAPI(context: TemplateContext): string {
    return `const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'pgrouting_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Routes
app.post('/api/route', async (req, res) => {
  try {
    const { start_lat, start_lon, end_lat, end_lon } = req.body;
    
    const query = \`
      WITH start_node AS (
        SELECT id, ST_Distance(geom, ST_SetSRID(ST_Point($1, $2), 4326)) as dist
        FROM routing.nodes
        ORDER BY dist LIMIT 1
      ),
      end_node AS (
        SELECT id, ST_Distance(geom, ST_SetSRID(ST_Point($3, $4), 4326)) as dist
        FROM routing.nodes
        ORDER BY dist LIMIT 1
      )
      SELECT 
        r.name,
        r.cost,
        ST_AsGeoJSON(r.geom) as geometry,
        p.seq
      FROM pgr_dijkstra(
        'SELECT id, source, target, cost FROM routing.roads',
        (SELECT id FROM start_node),
        (SELECT id FROM end_node)
      ) p
      JOIN routing.roads r ON p.edge = r.id
      ORDER BY p.seq;
    \`;
    
    const result = await pool.query(query, [start_lon, start_lat, end_lon, end_lat]);
    
    res.json({
      status: 'success',
      route: result.rows,
      total_segments: result.rows.length
    });
  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: 'pgRouting API' });
});

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});
`;
  }

  private generateGitHubActions(context: TemplateContext): string {
    return `name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgis/postgis:15-3.4
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    
    - name: Setup database
      run: |
        psql -h localhost -U postgres -d test_db -f 01-fundamentals/setup.sql
      env:
        PGPASSWORD: postgres
    
    - name: Run tests
      run: |
        python -m pytest tests/
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
`;
  }

  private generateDatasetReadme(context: TemplateContext): string {
    return `# Sample Datasets

This directory contains sample datasets for learning pgRouting and PostGIS.

## Available Datasets

${context.datasets.map(dataset => `
### ${dataset.name}
- **Description**: ${dataset.description}
- **Format**: ${dataset.format}
- **Size**: ${dataset.size}
- **Category**: ${dataset.category}
${dataset.features ? `- **Features**: ${dataset.features}` : ''}
`).join('\n')}

## Usage

1. Import the datasets using the provided SQL scripts
2. Create appropriate indexes for performance
3. Follow the module exercises to learn spatial operations

## Data Sources

All datasets are either synthetic or derived from open data sources.
Proper attribution is provided where required.
`;
  }

  private generateSampleGeoJSON(): string {
    return JSON.stringify({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            id: 1,
            name: "Broadway",
            type: "primary",
            oneway: false,
            speed_limit: 25
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [-73.9857, 40.7484],
              [-73.9847, 40.7494],
              [-73.9837, 40.7504]
            ]
          }
        },
        {
          type: "Feature",
          properties: {
            id: 2,
            name: "5th Avenue",
            type: "secondary",
            oneway: true,
            speed_limit: 25
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [-73.9735, 40.7589],
              [-73.9725, 40.7599],
              [-73.9715, 40.7609]
            ]
          }
        }
      ]
    }, null, 2);
  }

  private generateSampleCSV(): string {
    return `id,name,category,lat,lon,description
1,Central Park,park,40.7829,-73.9654,Large public park in Manhattan
2,Times Square,landmark,40.7580,-73.9855,Famous commercial intersection
3,Brooklyn Bridge,bridge,40.7061,-73.9969,Historic suspension bridge
4,Statue of Liberty,monument,40.6892,-74.0445,Iconic national monument
5,Empire State Building,building,40.7484,-73.9857,Art Deco skyscraper
`;
  }
}
