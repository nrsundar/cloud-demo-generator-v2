// Extension skill files — grounding data to prevent hallucination
// Each extension has: correct function signatures, valid SQL examples, CFN config

export interface ExtensionSkill {
  name: string;
  createExtension: string;
  validFunctions: string[];
  sampleQueries: string[];
  cfnParameters: Record<string, string>;
  pythonImports: string;
  commonMistakes: string[];
}

const skills: Record<string, ExtensionSkill> = {
  pgvector: {
    name: "pgvector",
    createExtension: "CREATE EXTENSION IF NOT EXISTS vector;",
    validFunctions: ["vector", "l2_distance", "cosine_distance", "inner_product", "ivfflat", "hnsw"],
    sampleQueries: [
      "CREATE TABLE items (id serial PRIMARY KEY, embedding vector(1536));",
      "SELECT * FROM items ORDER BY embedding <-> '[0.1,0.2,...]' LIMIT 5;",
      "CREATE INDEX ON items USING hnsw (embedding vector_cosine_ops);",
    ],
    cfnParameters: { "SharedPreloadLibraries": "" },
    pythonImports: "from pgvector.psycopg2 import register_vector",
    commonMistakes: [
      "Do NOT use 'vector_search()' — it doesn't exist. Use <-> operator for L2, <=> for cosine.",
      "Do NOT use 'CREATE INDEX USING gist' for vectors — use ivfflat or hnsw.",
      "Dimension must be specified: vector(1536), not just vector.",
    ],
  },
  postgis: {
    name: "PostGIS",
    createExtension: "CREATE EXTENSION IF NOT EXISTS postgis;",
    validFunctions: ["ST_Distance", "ST_DWithin", "ST_Contains", "ST_Intersects", "ST_Transform", "ST_MakePoint", "ST_SetSRID", "ST_GeomFromText", "ST_Buffer", "ST_Area"],
    sampleQueries: [
      "CREATE TABLE locations (id serial PRIMARY KEY, name text, geom geometry(Point, 4326));",
      "SELECT name, ST_Distance(geom::geography, ST_MakePoint(-73.99, 40.73)::geography) AS dist FROM locations ORDER BY dist LIMIT 10;",
      "CREATE INDEX idx_locations_geom ON locations USING GIST (geom);",
    ],
    cfnParameters: { "SharedPreloadLibraries": "" },
    pythonImports: "import psycopg2\n# PostGIS works via SQL — no special Python library needed",
    commonMistakes: [
      "Do NOT use 'ST_DistanceSphere' without casting to geography first.",
      "Always specify SRID (4326 for WGS84 lat/lon).",
      "Use geometry(Point, 4326) not just geometry for typed columns.",
    ],
  },
  pgrouting: {
    name: "pgRouting",
    createExtension: "CREATE EXTENSION IF NOT EXISTS pgrouting;\nCREATE EXTENSION IF NOT EXISTS postgis;",
    validFunctions: ["pgr_dijkstra", "pgr_astar", "pgr_ksp", "pgr_drivingDistance", "pgr_TSP", "pgr_createTopology"],
    sampleQueries: [
      "SELECT * FROM pgr_dijkstra('SELECT id, source, target, cost FROM edges', 1, 5, directed := false);",
      "SELECT pgr_createTopology('edges', 0.001, 'the_geom', 'id');",
      "CREATE TABLE edges (id serial, source int, target int, cost float, the_geom geometry(LineString, 4326));",
    ],
    cfnParameters: { "SharedPreloadLibraries": "" },
    pythonImports: "import psycopg2\n# pgRouting works via SQL functions",
    commonMistakes: [
      "Do NOT forget to run pgr_createTopology before routing queries.",
      "Edges table MUST have source, target, cost columns.",
      "pgr_dijkstra returns a set — use SELECT * FROM pgr_dijkstra(...).",
    ],
  },
  pg_trgm: {
    name: "pg_trgm",
    createExtension: "CREATE EXTENSION IF NOT EXISTS pg_trgm;",
    validFunctions: ["similarity", "word_similarity", "strict_word_similarity", "show_trgm", "set_limit"],
    sampleQueries: [
      "SELECT name, similarity(name, 'search term') AS sim FROM products WHERE name % 'search term' ORDER BY sim DESC;",
      "CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);",
      "SELECT set_limit(0.3);",
    ],
    cfnParameters: {},
    pythonImports: "import psycopg2",
    commonMistakes: [
      "Do NOT use LIKE for fuzzy search — use % operator or similarity() function.",
      "GIN index with gin_trgm_ops is required for performance.",
      "Default similarity threshold is 0.3 — adjust with set_limit().",
    ],
  },
  pg_cron: {
    name: "pg_cron",
    createExtension: "CREATE EXTENSION IF NOT EXISTS pg_cron;",
    validFunctions: ["cron.schedule", "cron.unschedule", "cron.job"],
    sampleQueries: [
      "SELECT cron.schedule('nightly-vacuum', '0 3 * * *', 'VACUUM ANALYZE');",
      "SELECT cron.schedule('refresh-views', '*/5 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stats');",
      "SELECT * FROM cron.job;",
    ],
    cfnParameters: { "SharedPreloadLibraries": "pg_cron" },
    pythonImports: "import psycopg2\n# pg_cron is managed via SQL — schedule jobs from Python by executing SQL",
    commonMistakes: [
      "pg_cron MUST be in shared_preload_libraries — requires DB restart.",
      "Jobs run in the 'postgres' database by default — use cron.schedule_in_database for others.",
      "Cron syntax is standard: minute hour day month weekday.",
    ],
  },
  auto_explain: {
    name: "auto_explain",
    createExtension: "LOAD 'auto_explain';\n-- Or add to shared_preload_libraries for persistent use",
    validFunctions: ["auto_explain.log_min_duration", "auto_explain.log_analyze", "auto_explain.log_buffers", "auto_explain.log_nested_statements"],
    sampleQueries: [
      "SET auto_explain.log_min_duration = '100ms';",
      "SET auto_explain.log_analyze = true;",
      "SET auto_explain.log_buffers = true;",
    ],
    cfnParameters: { "SharedPreloadLibraries": "auto_explain" },
    pythonImports: "import psycopg2\nimport logging",
    commonMistakes: [
      "auto_explain MUST be loaded via shared_preload_libraries or LOAD command.",
      "It logs to PostgreSQL log — not to a table. Check pg_log.",
      "log_analyze = true adds ANALYZE overhead to every query above threshold.",
    ],
  },
};

export function getExtensionSkill(extension: string): ExtensionSkill | undefined {
  const key = extension.toLowerCase().replace(/[-\s]/g, "_");
  return skills[key] || Object.values(skills).find(s => s.name.toLowerCase() === key);
}

export function getSkillPromptContext(extension: string): string {
  const skill = getExtensionSkill(extension);
  if (!skill) return "";
  return `
## GROUNDING: ${skill.name} Extension Knowledge (USE THIS — DO NOT HALLUCINATE)

### Correct SQL Setup:
${skill.createExtension}

### Valid Functions (ONLY use these):
${skill.validFunctions.join(", ")}

### Example Queries (follow this pattern):
${skill.sampleQueries.join("\n")}

### Python Usage:
${skill.pythonImports}

### COMMON MISTAKES TO AVOID:
${skill.commonMistakes.join("\n")}

### CloudFormation Notes:
${skill.cfnParameters.SharedPreloadLibraries ? `shared_preload_libraries must include: ${skill.cfnParameters.SharedPreloadLibraries}` : "No special CFN parameters needed."}
`;
}
