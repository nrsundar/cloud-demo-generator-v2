import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Repository } from "@shared/schema";

interface CodePreviewProps {
  repository: Repository;
}

export default function CodePreview({ repository }: CodePreviewProps) {
  const sqlCode = `-- PostGIS and pgRouting Setup
-- Module 01: Fundamentals

-- Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgrouting;

-- Create schema for routing examples
CREATE SCHEMA IF NOT EXISTS routing;

-- Create roads table with spatial column
CREATE TABLE routing.roads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    source INTEGER,
    target INTEGER,
    cost DOUBLE PRECISION,
    reverse_cost DOUBLE PRECISION,
    geom GEOMETRY(LINESTRING, 4326)
);

-- Create spatial index
CREATE INDEX roads_geom_idx 
ON routing.roads 
USING GIST (geom);

-- Sample data insertion
INSERT INTO routing.roads 
(name, source, target, cost, reverse_cost, geom) 
VALUES 
('Main Street', 1, 2, 0.5, 0.5, 
 ST_GeomFromText(
   'LINESTRING(-73.9857 40.7484, -73.9857 40.7494)', 
   4326
 ));`;

  const pythonCode = `import psycopg2
from flask import Flask, jsonify, request
import json

app = Flask(__name__)

class RoutingService:
    def __init__(self, db_config):
        self.conn = psycopg2.connect(**db_config)
    
    def find_shortest_path(self, start_lat, start_lon, 
                          end_lat, end_lon):
        """
        Find shortest path between two points
        using pgRouting Dijkstra algorithm
        """
        query = """
        WITH start_node AS (
          SELECT id, ST_Distance(geom, 
            ST_SetSRID(ST_Point(%s, %s), 4326)) as dist
          FROM routing.nodes
          ORDER BY dist LIMIT 1
        ),
        end_node AS (
          SELECT id, ST_Distance(geom, 
            ST_SetSRID(ST_Point(%s, %s), 4326)) as dist
          FROM routing.nodes
          ORDER BY dist LIMIT 1
        )
        SELECT r.name, r.cost, 
               ST_AsGeoJSON(r.geom) as geometry
        FROM pgr_dijkstra(
          'SELECT id, source, target, cost 
           FROM routing.roads',
          (SELECT id FROM start_node),
          (SELECT id FROM end_node)
        ) p
        JOIN routing.roads r ON p.edge = r.id;
        """
        
        cursor = self.conn.cursor()
        cursor.execute(query, (start_lon, start_lat, 
                              end_lon, end_lat))
        return cursor.fetchall()`;

  const propScopeSQL = `-- PropScope: High-Performance Property Search
-- Spatial indexing for 38GB+ property datasets

-- Create properties table with spatial optimization
CREATE TABLE properties (
    id BIGSERIAL PRIMARY KEY,
    address TEXT NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    bedrooms INTEGER,
    bathrooms DECIMAL(3,1),
    square_feet INTEGER,
    property_type VARCHAR(50),
    listing_status VARCHAR(20),
    geom GEOMETRY(POINT, 4326) NOT NULL,
    listing_date TIMESTAMP WITH TIME ZONE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Critical spatial indexes for sub-millisecond queries
CREATE INDEX CONCURRENTLY properties_geom_gist_idx 
ON properties USING GIST (geom);

-- Composite indexes for filtered spatial searches
CREATE INDEX CONCURRENTLY properties_price_geom_idx 
ON properties USING GIST (geom) 
WHERE price BETWEEN 100000 AND 10000000;

CREATE INDEX CONCURRENTLY properties_type_geom_idx 
ON properties (property_type, price) 
INCLUDE (bedrooms, bathrooms, square_feet);

-- Partitioning for large datasets (38GB+)
CREATE TABLE properties_active PARTITION OF properties
FOR VALUES IN ('Active', 'Pending');

CREATE TABLE properties_sold PARTITION OF properties  
FOR VALUES IN ('Sold', 'Withdrawn');

-- Performance function: nearby properties with radius
CREATE OR REPLACE FUNCTION find_nearby_properties(
    center_lat DECIMAL,
    center_lon DECIMAL, 
    radius_meters INTEGER DEFAULT 1000,
    max_results INTEGER DEFAULT 50
) RETURNS TABLE (
    property_id BIGINT,
    distance_meters DECIMAL,
    address TEXT,
    price DECIMAL,
    property_details JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        ST_Distance(
            ST_Transform(p.geom, 3857),
            ST_Transform(ST_SetSRID(ST_Point(center_lon, center_lat), 4326), 3857)
        )::DECIMAL as distance_meters,
        p.address,
        p.price,
        jsonb_build_object(
            'bedrooms', p.bedrooms,
            'bathrooms', p.bathrooms,
            'square_feet', p.square_feet,
            'type', p.property_type,
            'status', p.listing_status
        ) as property_details
    FROM properties p
    WHERE ST_DWithin(
        ST_Transform(p.geom, 3857),
        ST_Transform(ST_SetSRID(ST_Point(center_lon, center_lat), 4326), 3857),
        radius_meters
    )
    AND p.listing_status IN ('Active', 'Pending')
    ORDER BY distance_meters
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;`;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* SQL Example */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-lg">SQL Setup Script</CardTitle>
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            setup.sql
          </Badge>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-100 overflow-auto max-h-80">
          <pre><code>{sqlCode}</code></pre>
        </div>
      </div>
      
      {/* Python Example */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-lg">Python Integration</CardTitle>
          <Badge variant="outline" className="bg-green-100 text-green-800">
            routing_api.py
          </Badge>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-100 overflow-auto max-h-80">
          <pre><code>{pythonCode}</code></pre>
        </div>
      </div>

      {/* PropScope Performance Example */}
      <div className="xl:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-lg">PropScope: High-Performance Spatial Queries</CardTitle>
          <Badge variant="outline" className="bg-purple-100 text-purple-800">
            spatial_indexes.sql
          </Badge>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-100 overflow-auto max-h-80">
          <pre><code>{propScopeSQL}</code></pre>
        </div>
      </div>
    </div>
  );
}
