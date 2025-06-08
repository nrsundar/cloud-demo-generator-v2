export interface TemplateFile {
  path: string;
  content: string;
  variables?: Record<string, any>;
}

export interface RepositoryTemplate {
  name: string;
  language: string;
  databaseVersion: string;
  useCases: string[];
  complexityLevel: string;
}

export class GenerationEngine {
  static generateReadme(template: RepositoryTemplate): string {
    return `# ${template.name}

A comprehensive learning guide for pg_route and PostGIS focusing on ${template.useCases.join(", ").toLowerCase()}.

## Overview

This repository provides a structured learning path for mastering spatial databases with PostgreSQL, PostGIS, and pgRouting. The content is designed for ${template.complexityLevel.toLowerCase()} learners and includes practical examples using ${template.language}.

## Prerequisites

- ${template.databaseVersion}
- Basic SQL knowledge
- ${template.language} development environment

## Learning Path

### Module Structure
Each module contains:
- 📚 Theory documentation
- 💻 Practical examples
- 🏋️ Hands-on exercises
- ✅ Solutions and assessments

### Modules Overview

1. **PostGIS Fundamentals** - Installation, configuration, and basic concepts
2. **Spatial Data Types & Functions** - Geometry and geography types
3. **pgRouting Introduction** - Basic routing algorithms
4. **Network Topology Creation** - Building routing networks
5. **Advanced Routing Scenarios** - Multi-modal and time-dependent routing
6. **Performance Optimization** - Indexing and query optimization
7. **Integration Patterns** - APIs and microservices
8. **Real-world Projects** - Complete case studies
9. **Visualization & GIS Tools** - QGIS and web mapping
10. **Production Deployment** - Scaling and monitoring

## Quick Start

\`\`\`bash
# Clone the repository
git clone https://github.com/username/${template.name}.git
cd ${template.name}

# Start the development environment
docker-compose up -d

# Run setup scripts
${template.language === "Python" ? "python" : template.language === "Node.js" ? "node" : "java"} setup/initialize.${template.language === "Python" ? "py" : template.language === "Node.js" ? "js" : "java"}
\`\`\`

## Use Cases Covered

${template.useCases.map(useCase => `### ${useCase}
- Route optimization
- Network analysis
- Spatial queries
- Performance benchmarks`).join("\n\n")}

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
`;
  }

  static generateDockerCompose(template: RepositoryTemplate): string {
    return `version: '3.8'

services:
  postgres:
    image: postgis/postgis:15-3.4
    environment:
      POSTGRES_DB: routing_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./datasets:/datasets
      - ./setup:/docker-entrypoint-initdb.d
    command: postgres -c shared_preload_libraries=pg_stat_statements

  pgadmin:
    image: dpage/pgadmin4:latest
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@example.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      - postgres

${template.language === "Python" ? `  python-app:
    build: ./api-examples/python
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/routing_db
    depends_on:
      - postgres
    volumes:
      - ./api-examples/python:/app` : ""}

${template.language === "Node.js" ? `  node-app:
    build: ./api-examples/nodejs
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/routing_db
    depends_on:
      - postgres
    volumes:
      - ./api-examples/nodejs:/app` : ""}

volumes:
  postgres_data:
`;
  }

  static generateSetupSQL(template: RepositoryTemplate): string {
    return `-- PostGIS and pgRouting Setup for ${template.name}
-- Target: ${template.databaseVersion}

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgrouting;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS routing;
CREATE SCHEMA IF NOT EXISTS analysis;
CREATE SCHEMA IF NOT EXISTS datasets;

-- Set search path
SET search_path = routing, public;

-- Create base tables for routing network
CREATE TABLE IF NOT EXISTS routing.nodes (
    id BIGSERIAL PRIMARY KEY,
    osm_id BIGINT,
    lat DECIMAL(11,8),
    lon DECIMAL(11,8),
    geom GEOMETRY(POINT, 4326)
);

CREATE TABLE IF NOT EXISTS routing.edges (
    id BIGSERIAL PRIMARY KEY,
    osm_id BIGINT,
    source BIGINT,
    target BIGINT,
    cost DOUBLE PRECISION,
    reverse_cost DOUBLE PRECISION,
    length_m DOUBLE PRECISION,
    name TEXT,
    highway TEXT,
    maxspeed INTEGER,
    oneway TEXT,
    geom GEOMETRY(LINESTRING, 4326)
);

-- Create spatial indexes
CREATE INDEX IF NOT EXISTS nodes_geom_idx ON routing.nodes USING GIST (geom);
CREATE INDEX IF NOT EXISTS edges_geom_idx ON routing.edges USING GIST (geom);
CREATE INDEX IF NOT EXISTS edges_source_idx ON routing.edges (source);
CREATE INDEX IF NOT EXISTS edges_target_idx ON routing.edges (target);

-- Create functions for routing operations
CREATE OR REPLACE FUNCTION routing.calculate_edge_cost(
    geom GEOMETRY,
    maxspeed INTEGER DEFAULT 50
) RETURNS DOUBLE PRECISION AS $$
BEGIN
    RETURN ST_Length(ST_Transform(geom, 3857)) / (maxspeed * 1000.0 / 3600.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant permissions
GRANT USAGE ON SCHEMA routing TO PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA routing TO PUBLIC;

-- Create sample data based on use cases
${template.useCases.includes("Transportation") ? `
-- Transportation network sample
INSERT INTO routing.nodes (lat, lon, geom) VALUES 
(40.7589, -73.9851, ST_SetSRID(ST_Point(-73.9851, 40.7589), 4326)),
(40.7614, -73.9776, ST_SetSRID(ST_Point(-73.9776, 40.7614), 4326));

INSERT INTO routing.edges (source, target, cost, reverse_cost, name, highway, geom) VALUES
(1, 2, 0.5, 0.5, 'Broadway', 'primary', 
 ST_SetSRID(ST_MakeLine(ST_Point(-73.9851, 40.7589), ST_Point(-73.9776, 40.7614)), 4326));
` : ""}

-- Performance monitoring
CREATE OR REPLACE VIEW routing.performance_stats AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%routing%'
ORDER BY total_time DESC;

COMMENT ON DATABASE routing_db IS 'pg_route and PostGIS learning database - ${template.complexityLevel}';
`;
  }
}
