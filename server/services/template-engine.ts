import { promises as fs } from 'fs';
import path from 'path';
import type { RepositoryConfig } from '@shared/schema';

export interface TemplateContext {
  config: RepositoryConfig;
  modules: ModuleInfo[];
  datasets: DatasetInfo[];
  timestamp: string;
  version: string;
}

export interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  files: string[];
  exercises: number;
  estimatedHours: string;
}

export interface DatasetInfo {
  name: string;
  description: string;
  format: string;
  size: string;
  features?: number;
  category: string;
}

export class TemplateEngine {
  private templatesDir: string;

  constructor() {
    this.templatesDir = path.join(import.meta.dirname, '..', 'templates');
  }

  async renderTemplate(templateName: string, context: TemplateContext): Promise<string> {
    try {
      const templatePath = path.join(this.templatesDir, templateName);
      const template = await fs.readFile(templatePath, 'utf-8');
      return this.processTemplate(template, context);
    } catch (error) {
      console.error(`Error rendering template ${templateName}:`, error);
      throw new Error(`Failed to render template: ${templateName}`);
    }
  }

  private processTemplate(template: string, context: TemplateContext): string {
    // Simple template engine - replace {{variable}} with values
    return template.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      const value = this.getNestedValue(context, variable.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  getModules(config: RepositoryConfig): ModuleInfo[] {
    const baseModules: ModuleInfo[] = [
      {
        id: "01-fundamentals",
        name: "PostGIS Fundamentals",
        description: "Introduction to spatial databases, installation, and basic concepts.",
        files: ["README.md", "setup.sql", "examples.py", "exercises.md"],
        exercises: 5,
        estimatedHours: "4-6"
      },
      {
        id: "02-spatial-data-types",
        name: "Spatial Data Types & Functions",
        description: "Deep dive into geometry and geography types, spatial operations.",
        files: ["README.md", "geometry_types.sql", "spatial_functions.py", "exercises.md"],
        exercises: 8,
        estimatedHours: "6-8"
      },
      {
        id: "03-routing-basics",
        name: "pg_route Introduction",
        description: "Setting up pg_route, basic routing algorithms, shortest path.",
        files: ["README.md", "pgrouting_setup.sql", "basic_routing.py", "exercises.md"],
        exercises: 6,
        estimatedHours: "5-7"
      },
      {
        id: "04-network-topology",
        name: "Network Topology Creation",
        description: "Building and managing network topologies for routing.",
        files: ["README.md", "topology_creation.sql", "network_analysis.py", "exercises.md"],
        exercises: 10,
        estimatedHours: "8-10"
      },
      {
        id: "05-advanced-routing",
        name: "Advanced Routing Algorithms",
        description: "Dijkstra, A*, bidirectional algorithms, and performance optimization.",
        files: ["README.md", "advanced_algorithms.sql", "routing_optimization.py", "exercises.md"],
        exercises: 12,
        estimatedHours: "10-12"
      }
    ];

    // Add conditional modules based on configuration
    if (config.useCases.includes("transportation")) {
      baseModules.push({
        id: "06-transportation",
        name: "Transportation Use Cases",
        description: "Real-world transportation routing scenarios and implementations.",
        files: ["README.md", "transportation_routing.sql", "transit_api.py", "exercises.md"],
        exercises: 8,
        estimatedHours: "6-8"
      });
    }

    if (config.useCases.includes("logistics")) {
      baseModules.push({
        id: "07-logistics",
        name: "Logistics & Delivery Optimization",
        description: "Vehicle routing problems, delivery optimization, and fleet management.",
        files: ["README.md", "vrp_solver.sql", "delivery_optimization.py", "exercises.md"],
        exercises: 10,
        estimatedHours: "8-10"
      });
    }

    if (config.includeVisualization) {
      baseModules.push({
        id: "08-visualization",
        name: "Spatial Data Visualization",
        description: "Creating maps and visualizations with Leaflet, QGIS integration.",
        files: ["README.md", "leaflet_examples.html", "qgis_integration.py", "exercises.md"],
        exercises: 6,
        estimatedHours: "4-6"
      });
    }

    return baseModules;
  }

  getDatasets(config: RepositoryConfig): DatasetInfo[] {
    const datasets: DatasetInfo[] = [
      {
        name: "NYC Road Network",
        description: "Manhattan street grid with routing attributes",
        format: "GeoJSON",
        size: "2.4 MB",
        features: 12847,
        category: "transportation"
      },
      {
        name: "Transit Routes",
        description: "Bus and subway lines with GTFS data",
        format: "GTFS",
        size: "8.1 MB",
        category: "transportation"
      },
      {
        name: "POI Database",
        description: "Points of interest for routing destinations",
        format: "CSV",
        size: "1.2 MB",
        features: 5632,
        category: "general"
      }
    ];

    if (config.useCases.includes("logistics")) {
      datasets.push({
        name: "Delivery Network",
        description: "Distribution centers and delivery routes",
        format: "GeoJSON",
        size: "3.8 MB",
        features: 8924,
        category: "logistics"
      });
    }

    return datasets;
  }
}
