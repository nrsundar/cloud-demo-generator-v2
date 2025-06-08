import { repositories, users, downloadLogs, type Repository, type InsertRepository, type GeneratedFile, type LearningModule, type DatasetInfo, type RepositoryStats, type Property, type PropertySearchParams, type User, type InsertUser, type DownloadLog, type InsertDownloadLog } from "@shared/schema";
import archiver from 'archiver';

export interface IStorage {
  getRepository(id: number): Promise<Repository | undefined>;
  createRepository(repository: InsertRepository): Promise<Repository>;
  updateRepository(id: number, updates: Partial<Repository>): Promise<Repository | undefined>;
  getAllRepositories(): Promise<Repository[]>;
  generateRepositoryContent(id: number): Promise<void>;
  generateRepositoryZip(id: number): Promise<Buffer>;
  getRepositoryStats(id: number): Promise<RepositoryStats>;
  getLearningModules(repositoryId: number): Promise<LearningModule[]>;
  getDatasets(repositoryId: number): Promise<DatasetInfo[]>;
  
  // User management
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: InsertUser): Promise<User>;
  
  // Download tracking
  logDownload(download: InsertDownloadLog): Promise<DownloadLog>;
  getDownloadStats(): Promise<{
    totalDownloads: number;
    uniqueUsers: number;
    topUseCases: Array<{ useCase: string; count: number }>;
    topLanguages: Array<{ language: string; count: number }>;
    recentDownloads: DownloadLog[];
  }>;
}

export class MemStorage implements IStorage {
  private repositories: Map<number, Repository>;
  private currentId: number;
  private generationQueue: number[] = [];
  private isGenerating: boolean = false;

  constructor() {
    this.repositories = new Map();
    this.currentId = 1;
  }

  async getRepository(id: number): Promise<Repository | undefined> {
    return this.repositories.get(id);
  }

  async createRepository(insertRepository: InsertRepository): Promise<Repository> {
    const id = this.currentId++;
    const repository: Repository = {
      ...insertRepository,
      id,
      databaseType: insertRepository.databaseType || "RDS",
      instanceType: insertRepository.instanceType || "db.t3.medium",
      awsRegion: insertRepository.awsRegion || "us-west-2",
      status: "pending",
      progress: 0,
      generatedFiles: [],
      estimatedSize: insertRepository.useCases.includes("Real Estate/Property Search") ? "150MB" : "85MB",
      createdAt: new Date(),
    };
    this.repositories.set(id, repository);
    return repository;
  }

  async updateRepository(id: number, updates: Partial<Repository>): Promise<Repository | undefined> {
    const repository = this.repositories.get(id);
    if (!repository) return undefined;

    const updated = { ...repository, ...updates };
    this.repositories.set(id, updated);
    return updated;
  }

  async getAllRepositories(): Promise<Repository[]> {
    return Array.from(this.repositories.values());
  }

  async generateRepositoryContent(id: number): Promise<void> {
    // Add to queue if not already queued
    if (!this.generationQueue.includes(id)) {
      this.generationQueue.push(id);
      await this.updateRepository(id, { status: "queued", progress: 0 });
    }

    // Process queue if not currently generating
    if (!this.isGenerating) {
      this.processGenerationQueue();
    }
  }

  private async processGenerationQueue(): Promise<void> {
    if (this.isGenerating || this.generationQueue.length === 0) return;

    this.isGenerating = true;

    while (this.generationQueue.length > 0) {
      const id = this.generationQueue.shift()!;
      await this.generateSingleRepository(id);
    }

    this.isGenerating = false;
  }

  private async generateSingleRepository(id: number): Promise<void> {
    const repository = this.repositories.get(id);
    if (!repository) return;

    try {
      // Start generation
      await this.updateRepository(id, { status: "generating", progress: 5 });
      
      // Generate file structure
      const files = this.generateFileStructure(repository);
      await this.updateRepository(id, { progress: 10 });

      // Simulate progressive file generation with realistic timing
      const totalFiles = files.length;
      const isPropertySearch = repository.useCases.includes("Real Estate/Property Search");
      const baseDelay = isPropertySearch ? 150 : 100; // Longer for property search repos

      for (let i = 0; i < totalFiles; i++) {
        // Variable delay based on file type and size
        const file = files[i];
        let delay = baseDelay;
        
        if (file.type === "folder") {
          delay = 50; // Folders are quick
        } else if (file.size && file.size > 10000000) { // Large files (>10MB)
          delay = baseDelay * 3;
        } else if (file.language === "sql") {
          delay = baseDelay * 1.5; // SQL files take longer
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Update file status
        files[i].status = "complete";
        
        // Calculate progress (10% to 95% for file generation, 95-100% for finalization)
        const fileProgress = Math.floor(10 + ((i + 1) / totalFiles) * 85);
        
        await this.updateRepository(id, { 
          generatedFiles: [...files],
          progress: fileProgress,
          status: "generating"
        });
      }

      // Finalization phase
      await new Promise(resolve => setTimeout(resolve, 300));
      await this.updateRepository(id, { progress: 98 });
      
      await new Promise(resolve => setTimeout(resolve, 200));
      await this.updateRepository(id, { 
        progress: 100,
        status: "complete"
      });

    } catch (error) {
      await this.updateRepository(id, { 
        status: "error", 
        progress: 0 
      });
    }
  }

  private generateFileStructure(repository: Repository): GeneratedFile[] {
    const isPropertySearch = repository.useCases.includes("Real Estate/Property Search");
    
    const baseFiles: GeneratedFile[] = [
      { path: "README.md", type: "file", size: 15000, status: "pending", language: "markdown" },
      { path: "docker-compose.yml", type: "file", size: 2500, status: "pending", language: "yaml" },
      { path: ".gitignore", type: "file", size: 800, status: "pending", language: "text" },
      { path: "LICENSE", type: "file", size: 1200, status: "pending", language: "text" },
    ];

    if (isPropertySearch) {
      baseFiles.push(
        { path: "EDUCATIONAL_NOTICE.md", type: "file", size: 1500, status: "pending", language: "markdown" },
        { path: "propscope-demo.yml", type: "file", size: 3000, status: "pending", language: "yaml" }
      );
    }

    const modules: GeneratedFile[] = [];
    const moduleCount = isPropertySearch ? 12 : 10; // More modules for property search
    
    for (let i = 1; i <= moduleCount; i++) {
      const moduleNum = i.toString().padStart(2, '0');
      let moduleName = `module-${i}`;
      
      // Specialized modules for property search
      if (isPropertySearch) {
        const propertyModules = [
          "postgis-fundamentals", "spatial-indexing", "property-schema-design",
          "high-performance-queries", "spatial-distance-calculations", "data-partitioning",
          "real-time-search-apis", "performance-optimization", "scaling-strategies",
          "propscope-implementation", "frontend-integration", "production-deployment"
        ];
        moduleName = propertyModules[i - 1] || `advanced-${i}`;
      }
      
      modules.push(
        { path: `${moduleNum}-${moduleName}/`, type: "folder", status: "pending" },
        { path: `${moduleNum}-${moduleName}/README.md`, type: "file", size: 8000, status: "pending", language: "markdown" },
        { path: `${moduleNum}-${moduleName}/setup.sql`, type: "file", size: 5000, status: "pending", language: "sql" },
        { path: `${moduleNum}-${moduleName}/examples.${this.getFileExtension(repository.language)}`, type: "file", size: 12000, status: "pending", language: repository.language.toLowerCase() },
        { path: `${moduleNum}-${moduleName}/exercises/`, type: "folder", status: "pending" },
        { path: `${moduleNum}-${moduleName}/exercises/README.md`, type: "file", size: 3000, status: "pending", language: "markdown" },
        { path: `${moduleNum}-${moduleName}/solutions/`, type: "folder", status: "pending" },
      );
    }

    const datasetFiles: GeneratedFile[] = [
      { path: "datasets/", type: "folder", status: "pending" },
    ];

    if (isPropertySearch) {
      datasetFiles.push(
        { path: "datasets/sf_properties_sample.csv", type: "file", size: 45000000, status: "pending", language: "csv" },
        { path: "datasets/property_boundaries.geojson", type: "file", size: 12000000, status: "pending", language: "json" },
        { path: "datasets/neighborhoods.geojson", type: "file", size: 3200000, status: "pending", language: "json" },
        { path: "datasets/schools_hospitals_poi.csv", type: "file", size: 2800000, status: "pending", language: "csv" },
        { path: "datasets/property_import.sql", type: "file", size: 5500, status: "pending", language: "sql" },
        { path: "datasets/performance_benchmarks.sql", type: "file", size: 4200, status: "pending", language: "sql" },
        { path: "datasets/README.md", type: "file", size: 6000, status: "pending", language: "markdown" }
      );
    } else {
      datasetFiles.push(
        { path: "datasets/nyc_roads.geojson", type: "file", size: 2400000, status: "pending", language: "json" },
        { path: "datasets/transit_routes.gtfs", type: "file", size: 8100000, status: "pending", language: "text" },
        { path: "datasets/poi_database.csv", type: "file", size: 1200000, status: "pending", language: "csv" },
        { path: "datasets/README.md", type: "file", size: 4000, status: "pending", language: "markdown" }
      );
    }

    const apiFiles: GeneratedFile[] = [
      { path: "api-examples/", type: "folder", status: "pending" },
    ];

    if (isPropertySearch) {
      apiFiles.push(
        { path: "api-examples/propscope/", type: "folder", status: "pending" },
        { path: `api-examples/propscope/property_search_api.${this.getFileExtension(repository.language)}`, type: "file", size: 18000, status: "pending", language: repository.language.toLowerCase() },
        { path: `api-examples/propscope/spatial_queries.${this.getFileExtension(repository.language)}`, type: "file", size: 15000, status: "pending", language: repository.language.toLowerCase() },
        { path: "api-examples/propscope/spatial_indexes.sql", type: "file", size: 12000, status: "pending", language: "sql" },
        { path: "api-examples/propscope/performance_tuning.sql", type: "file", size: 8500, status: "pending", language: "sql" },
        { path: "api-examples/propscope/load_testing.sql", type: "file", size: 6000, status: "pending", language: "sql" },
        { path: `api-examples/propscope/frontend_integration.${repository.language === "Python" ? "py" : "js"}`, type: "file", size: 14000, status: "pending", language: repository.language.toLowerCase() },
        { path: "api-examples/propscope/docker/", type: "folder", status: "pending" },
        { path: "api-examples/propscope/docker/Dockerfile", type: "file", size: 2500, status: "pending", language: "dockerfile" },
        { path: "api-examples/propscope/docker/docker-compose.yml", type: "file", size: 3500, status: "pending", language: "yaml" }
      );
    } else {
      apiFiles.push(
        { path: `api-examples/routing_service.${this.getFileExtension(repository.language)}`, type: "file", size: 15000, status: "pending", language: repository.language.toLowerCase() },
        { path: "api-examples/docker/", type: "folder", status: "pending" },
        { path: "api-examples/docker/Dockerfile", type: "file", size: 1500, status: "pending", language: "dockerfile" }
      );
    }

    const testFiles: GeneratedFile[] = [
      { path: "tests/", type: "folder", status: "pending" },
      { path: "tests/unit/", type: "folder", status: "pending" },
      { path: "tests/integration/", type: "folder", status: "pending" },
    ];

    if (isPropertySearch) {
      testFiles.push(
        { path: `tests/test_property_search.${this.getFileExtension(repository.language)}`, type: "file", size: 12000, status: "pending", language: repository.language.toLowerCase() },
        { path: `tests/test_spatial_queries.${this.getFileExtension(repository.language)}`, type: "file", size: 10000, status: "pending", language: repository.language.toLowerCase() },
        { path: "tests/performance/", type: "folder", status: "pending" },
        { path: "tests/performance/load_test.sql", type: "file", size: 6500, status: "pending", language: "sql" },
        { path: "tests/performance/benchmark_queries.sql", type: "file", size: 8200, status: "pending", language: "sql" }
      );
    } else {
      testFiles.push(
        { path: `tests/test_routing.${this.getFileExtension(repository.language)}`, type: "file", size: 8000, status: "pending", language: repository.language.toLowerCase() }
      );
    }

    return [...baseFiles, ...modules, ...datasetFiles, ...apiFiles, ...testFiles];
  }

  private getFileExtension(language: string): string {
    switch (language.toLowerCase()) {
      case "python": return "py";
      case "node.js": return "js";
      case "java": return "java";
      default: return "txt";
    }
  }

  async getRepositoryStats(id: number): Promise<RepositoryStats> {
    const repository = this.repositories.get(id);
    if (!repository) {
      return { totalFiles: 0, modules: 0, codeExamples: 0, estimatedSize: "0MB" };
    }

    const files = repository.generatedFiles || [];
    const codeFiles = files.filter(f => f.language && f.language !== "markdown" && f.language !== "text");
    const isPropertySearch = repository.useCases.includes("Real Estate/Property Search");
    
    return {
      totalFiles: files.length,
      modules: isPropertySearch ? 12 : 10,
      codeExamples: codeFiles.length,
      estimatedSize: isPropertySearch ? "~78GB" : "~45MB"
    };
  }

  async getLearningModules(repositoryId: number): Promise<LearningModule[]> {
    const repository = this.repositories.get(repositoryId);
    const isPropertySearch = repository?.useCases.includes("Real Estate/Property Search");

    if (isPropertySearch) {
      return [
        {
          id: "01",
          title: "PostGIS Fundamentals",
          description: "Spatial database concepts, installation, and property data modeling.",
          order: 1,
          documents: 15,
          examples: 12,
          exercises: 8,
          estimatedHours: "5-7 hours",
          status: "complete"
        },
        {
          id: "02",
          title: "Spatial Indexing Strategies",
          description: "GIST indexes, performance optimization for large property datasets.",
          order: 2,
          documents: 18,
          examples: 15,
          exercises: 10,
          estimatedHours: "6-8 hours",
          status: "complete"
        },
        {
          id: "03",
          title: "Property Schema Design",
          description: "Optimal table structures, partitioning, and data types for real estate.",
          order: 3,
          documents: 12,
          examples: 20,
          exercises: 8,
          estimatedHours: "4-6 hours",
          status: "generating"
        },
        {
          id: "04",
          title: "High-Performance Queries",
          description: "Sub-millisecond spatial searches, distance calculations, and filtering.",
          order: 4,
          documents: 16,
          examples: 25,
          exercises: 12,
          estimatedHours: "8-10 hours",
          status: "pending"
        },
        {
          id: "05",
          title: "PropScope Implementation",
          description: "Building a complete property search application with real-time performance.",
          order: 5,
          documents: 20,
          examples: 30,
          exercises: 15,
          estimatedHours: "12-15 hours",
          status: "pending"
        },
        {
          id: "06",
          title: "Production Scaling",
          description: "Handling 38GB+ datasets, clustering, and performance monitoring.",
          order: 6,
          documents: 14,
          examples: 18,
          exercises: 10,
          estimatedHours: "10-12 hours",
          status: "pending"
        }
      ];
    }

    return [
      {
        id: "01",
        title: "PostGIS Fundamentals",
        description: "Introduction to spatial databases, installation, and basic concepts.",
        order: 1,
        documents: 12,
        examples: 8,
        exercises: 5,
        estimatedHours: "4-6 hours",
        status: "complete"
      },
      {
        id: "02",
        title: "Spatial Data Types & Functions",
        description: "Deep dive into geometry and geography types, spatial operations.",
        order: 2,
        documents: 15,
        examples: 12,
        exercises: 8,
        estimatedHours: "6-8 hours",
        status: "complete"
      },
      {
        id: "03",
        title: "pg_route Introduction",
        description: "Setting up pg_route, basic routing algorithms, shortest path.",
        order: 3,
        documents: 10,
        examples: 15,
        exercises: 6,
        estimatedHours: "5-7 hours",
        status: "generating"
      },
      {
        id: "04",
        title: "Network Topology Creation",
        description: "Building and managing network topologies for routing.",
        order: 4,
        documents: 14,
        examples: 18,
        exercises: 10,
        estimatedHours: "8-10 hours",
        status: "pending"
      }
    ];
  }

  async getDatasets(repositoryId: number): Promise<DatasetInfo[]> {
    const repository = this.repositories.get(repositoryId);
    const isPropertySearch = repository?.useCases.includes("Real Estate/Property Search");

    if (isPropertySearch) {
      return [
        {
          name: "SF Properties Dataset",
          description: "45GB of real estate listings",
          format: "CSV",
          size: "45.2 GB",
          features: "2,847,392",
          icon: "fas fa-home",
          color: "blue-500",
          status: "complete"
        },
        {
          name: "Property Boundaries",
          description: "Spatial property polygons",
          format: "GeoJSON",
          size: "12.1 GB",
          features: "1,923,847",
          icon: "fas fa-vector-square",
          color: "green-500",
          status: "processing"
        },
        {
          name: "Neighborhood Data",
          description: "District boundaries and demographics",
          format: "GeoJSON",
          size: "3.2 GB",
          features: "15,847",
          icon: "fas fa-map",
          color: "purple-500",
          status: "complete"
        },
        {
          name: "Schools & Hospitals",
          description: "Points of interest for property valuation",
          format: "CSV",
          size: "2.8 GB",
          features: "45,632",
          icon: "fas fa-hospital",
          color: "red-500",
          status: "queued"
        }
      ];
    }

    return [
      {
        name: "NYC Road Network",
        description: "Manhattan street grid",
        format: "GeoJSON",
        size: "2.4 MB",
        features: "12,847",
        icon: "fas fa-road",
        color: "blue-500",
        status: "complete"
      },
      {
        name: "Transit Routes",
        description: "Bus and subway lines",
        format: "GTFS",
        size: "8.1 MB",
        features: "472",
        icon: "fas fa-bus",
        color: "green-500",
        status: "processing"
      },
      {
        name: "POI Database",
        description: "Points of interest",
        format: "CSV",
        size: "1.2 MB",
        features: "5,632",
        icon: "fas fa-map-marker-alt",
        color: "red-500",
        status: "queued"
      }
    ];
  }

  async searchNearbyProperties(params: PropertySearchParams): Promise<Property[]> {
    // Mock high-performance property search for demonstration
    const mockProperties: Property[] = [
      {
        id: 1001,
        address: "123 Maple Street, San Francisco, CA 94102",
        price: 1250000,
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 1800,
        propertyType: "Single Family",
        listingStatus: "Active",
        latitude: 37.7749,
        longitude: -122.4194,
        geom: JSON.stringify({
          type: "Point",
          coordinates: [-122.4194, 37.7749]
        }),
        listingDate: new Date("2024-01-15"),
        lastUpdated: new Date("2024-01-20")
      },
      {
        id: 1002,
        address: "456 Oak Avenue, San Francisco, CA 94103",
        price: 950000,
        bedrooms: 2,
        bathrooms: 1,
        squareFeet: 1200,
        propertyType: "Condo",
        listingStatus: "Active",
        latitude: 37.7849,
        longitude: -122.4094,
        geom: JSON.stringify({
          type: "Point",
          coordinates: [-122.4094, 37.7849]
        }),
        listingDate: new Date("2024-01-18"),
        lastUpdated: new Date("2024-01-22")
      },
      {
        id: 1003,
        address: "789 Pine Road, San Francisco, CA 94104",
        price: 2100000,
        bedrooms: 4,
        bathrooms: 3,
        squareFeet: 2500,
        propertyType: "Single Family",
        listingStatus: "Pending",
        latitude: 37.7649,
        longitude: -122.4294,
        geom: JSON.stringify({
          type: "Point",
          coordinates: [-122.4294, 37.7649]
        }),
        listingDate: new Date("2024-01-10"),
        lastUpdated: new Date("2024-01-25")
      }
    ];

    // Filter by price range if specified
    let filtered = mockProperties;
    if (params.priceMin) {
      filtered = filtered.filter(p => p.price >= params.priceMin!);
    }
    if (params.priceMax) {
      filtered = filtered.filter(p => p.price <= params.priceMax!);
    }
    if (params.propertyType) {
      filtered = filtered.filter(p => p.propertyType === params.propertyType);
    }

    // Limit results
    const maxResults = params.maxResults || 50;
    return filtered.slice(0, maxResults);
  }

  async getPropertyById(id: number): Promise<Property | undefined> {
    const allProperties = await this.searchNearbyProperties({ propertyId: 0, radiusMeters: 50000 });
    return allProperties.find(p => p.id === id);
  }

  async generateRepositoryZip(id: number): Promise<Buffer> {
    const repository = this.repositories.get(id);
    if (!repository || repository.status !== "complete") {
      throw new Error("Repository not found or not complete");
    }

    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      const isPropertySearch = repository.useCases.includes("Real Estate/Property Search");
      
      // Add main README
      archive.append(this.generateMainReadme(repository), { name: 'README.md' });
      
      // Add AWS CloudFormation infrastructure files
      archive.append(this.generateCloudFormationMain(repository), { name: 'cloudformation/main.yaml' });
      archive.append(this.generateCloudFormationParameters(repository), { name: 'cloudformation/parameters.json' });
      archive.append(this.generateCloudFormationVPC(repository), { name: 'cloudformation/vpc.yaml' });
      archive.append(this.generateCloudFormationDatabase(repository), { name: 'cloudformation/database.yaml' });
      archive.append(this.generateCloudFormationSecurity(repository), { name: 'cloudformation/security.yaml' });
      archive.append(this.generateCloudFormationMonitoring(repository), { name: 'cloudformation/monitoring.yaml' });
      
      // Add database setup
      archive.append(this.generateDatabaseSetup(repository), { name: 'database/setup.sql' });
      archive.append(this.generateDatabaseMigrations(repository), { name: 'database/migrations/001_initial_schema.sql' });
      
      // Add Ubuntu deployment scripts
      archive.append(this.generateBastionSetupScript(repository), { name: 'scripts/bastion-setup.sh' });
      archive.append(this.generateUbuntuDeploymentGuide(repository), { name: 'docs/ubuntu-deployment.md' });
      
      // Add application code
      const moduleCount = isPropertySearch ? 12 : 10;
      for (let i = 1; i <= moduleCount; i++) {
        const moduleContent = this.generateModuleContent(i, repository, isPropertySearch);
        archive.append(moduleContent, { name: `modules/module_${i.toString().padStart(2, '0')}/README.md` });
        
        const codeExample = this.generateCodeExample(i, repository, isPropertySearch);
        const ext = this.getFileExtension(repository.language);
        archive.append(codeExample, { name: `modules/module_${i.toString().padStart(2, '0')}/example.${ext}` });
      }

      // Add package management files
      if (repository.language === "Python") {
        archive.append(this.generateRequirements(), { name: 'requirements.txt' });
        archive.append(this.generatePyprojectToml(repository), { name: 'pyproject.toml' });
      } else if (repository.language === "JavaScript" || repository.language === "Node.js") {
        archive.append(this.generatePackageJson(repository), { name: 'package.json' });
      }

      // Add deployment scripts
      archive.append(this.generateDeployScript(repository), { name: 'deploy.sh' });
      archive.append(this.generateSetupScript(repository), { name: 'setup.sh' });
      
      // Add environment configuration
      archive.append(this.generateEnvExample(repository), { name: '.env.example' });
      
      // Add dataset files
      archive.append(this.generateSampleDataset(repository), { name: 'datasets/sample_data.geojson' });
      
      // Add API server
      archive.append(this.generateAPIServer(repository), { name: `api/server.${this.getFileExtension(repository.language)}` });
      
      // Add demo scripts and presentation guides
      archive.append(this.generateDemoScript(repository), { name: 'demo/demo-script.md' });
      archive.append(this.generatePresentationGuide(repository), { name: 'demo/presentation-guide.md' });
      archive.append(this.generateCustomerTalkingPoints(repository), { name: 'demo/customer-talking-points.md' });

      archive.finalize();
    });
  }

  private generateMainReadme(repository: Repository): string {
    const isPropertySearch = repository.useCases.includes("Real Estate/Property Search");
    return `# ${repository.name}

## Educational Repository for ${repository.useCases.join(", ")} with AWS Infrastructure

**⚠️ EDUCATIONAL PURPOSE ONLY ⚠️**
This repository contains comprehensive learning materials and production-ready infrastructure for pg_route and PostGIS development.

### Overview
- **Language**: ${repository.language}
- **Database**: ${repository.databaseVersion}
- **Use Case**: ${repository.useCases.join(", ")}
- **Complexity**: ${repository.complexityLevel}
- **Modules**: ${isPropertySearch ? 12 : 10} comprehensive learning modules

### Infrastructure
- **Database**: AWS ${repository.databaseVersion.includes('Aurora') ? 'Aurora PostgreSQL' : 'RDS PostgreSQL'}
- **Instance Type**: Configurable via CloudFormation parameters
- **Networking**: VPC with public/private subnets
- **Security**: Security groups and IAM roles included

### Quick Start

#### Local Development
\`\`\`bash
# 1. Start local environment
docker-compose up -d

# 2. Run database setup
./setup.sh

# 3. Start application
${repository.language === "Python" ? "python app.py" : "npm start"}
\`\`\`

#### AWS Deployment
\`\`\`bash
# 1. Configure AWS credentials
aws configure

# 2. Deploy infrastructure
cd cloudformation
aws cloudformation create-stack --stack-name ${repository.name} --template-body file://main.yaml --parameters file://parameters.json --capabilities CAPABILITY_IAM

# 3. Deploy application
./deploy.sh
\`\`\`

### Learning Modules
${Array.from({ length: isPropertySearch ? 12 : 10 }, (_, i) => `- Module ${(i + 1).toString().padStart(2, '0')}: ${this.getModuleTitle(i + 1, isPropertySearch)}`).join('\n')}

### Performance Targets
${isPropertySearch ? 
`- Query Response Time: < 10ms for spatial searches
- Dataset Size: Handles 38GB+ property datasets
- Concurrent Users: 1000+ simultaneous searches` :
`- Route Calculation: < 100ms for complex paths
- Network Size: Handles city-scale road networks
- Optimization: Advanced algorithms included`}

Generated on: ${new Date().toISOString()}
`;
  }

  private generateCloudFormationInfrastructure(repository: Repository): string {
    const isAurora = repository.databaseVersion.includes('Aurora');
    const postgresVersion = this.extractPostgresVersion(repository.databaseVersion);
    
    return `AWSTemplateFormatVersion: '2010-09-09'
Description: 'Complete AWS infrastructure for ${repository.name} with Ubuntu Bastion host'

Parameters:
  ProjectName:
    Type: String
    Default: '${repository.name}'
    Description: 'Project name for resource naming'
  
  PostgreSQLVersion:
    Type: String
    Default: '${postgresVersion}'
    Description: 'PostgreSQL engine version'
  
  DatabaseInstanceType:
    Type: String
    Default: '${isAurora ? 'db.r6g.large' : 'db.t3.medium'}'
    Description: 'Database instance type'
  
  BastionInstanceType:
    Type: String
    Default: 't3.micro'
    Description: 'Bastion host instance type'
  
  KeyPairName:
    Type: AWS::EC2::KeyPair::KeyName
    Description: 'EC2 Key Pair for SSH access to bastion host'

Resources:
  # VPC Configuration
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-vpc'

  # Internet Gateway
  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-igw'

  InternetGatewayAttachment:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      InternetGatewayId: !Ref InternetGateway
      VpcId: !Ref VPC

  # Public Subnets
  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: 10.0.1.0/24
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-public-1'

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: 10.0.2.0/24
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-public-2'

  # Private Subnets
  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: 10.0.10.0/24
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-private-1'

  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: 10.0.11.0/24
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-private-2'

  # Route Tables
  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-public-rt'

  DefaultPublicRoute:
    Type: AWS::EC2::Route
    DependsOn: InternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  PublicSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PublicRouteTable
      SubnetId: !Ref PublicSubnet1

  PublicSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PublicRouteTable
      SubnetId: !Ref PublicSubnet2

  # Security Groups
  BastionSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub '\${ProjectName}-bastion-sg'
      GroupDescription: Security group for bastion host
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 3000
          ToPort: 3000
          CidrIp: 0.0.0.0/0
      SecurityGroupEgress:
        - IpProtocol: -1
          CidrIp: 0.0.0.0/0
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-bastion-sg'

  DatabaseSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub '\${ProjectName}-db-sg'
      GroupDescription: Security group for database
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 5432
          ToPort: 5432
          SourceSecurityGroupId: !Ref BastionSecurityGroup
      SecurityGroupEgress:
        - IpProtocol: -1
          CidrIp: 0.0.0.0/0
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-db-sg'

  # Database Subnet Group
  DatabaseSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Subnet group for database
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-db-subnet-group'

  # Ubuntu Bastion Host
  BastionHost:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-0c02fb55956c7d316  # Ubuntu 22.04 LTS (update for your region)
      InstanceType: !Ref BastionInstanceType
      KeyName: !Ref KeyPairName
      SubnetId: !Ref PublicSubnet1
      SecurityGroupIds:
        - !Ref BastionSecurityGroup
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          apt-get update
          apt-get install -y postgresql-client git curl
          # User will upload and run setup script manually
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-bastion'

  # RDS Database Instance
  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Sub '\${ProjectName}-database'
      DBInstanceClass: !Ref DatabaseInstanceType
      Engine: postgres
      EngineVersion: !Ref PostgreSQLVersion
      MasterUsername: postgres
      MasterUserPassword: SecurePassword123!
      AllocatedStorage: ${repository.useCases.includes("Real Estate/Property Search") ? "100" : "20"}
      StorageType: gp3
      StorageEncrypted: true
      VPCSecurityGroups:
        - !Ref DatabaseSecurityGroup
      DBSubnetGroupName: !Ref DatabaseSubnetGroup
      BackupRetentionPeriod: 7
      DeleteAutomatedBackups: true
      DeletionProtection: false
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-database'

Outputs:
  VPCId:
    Description: VPC ID
    Value: !Ref VPC

  BastionPublicIP:
    Description: Bastion host public IP
    Value: !GetAtt BastionHost.PublicIp

  DatabaseEndpoint:
    Description: Database endpoint
    Value: !GetAtt Database.Endpoint.Address

  DatabasePort:
    Description: Database port
    Value: !GetAtt Database.Endpoint.Port

  SSHCommand:
    Description: SSH command to connect to bastion host
    Value: !Sub 'ssh -i your-key.pem ubuntu@\${BastionHost.PublicIp}'

  DatabaseConnection:
    Description: Database connection string from bastion host
    Value: !Sub 'postgresql://postgres:SecurePassword123!@\${Database.Endpoint.Address}:5432/postgres'
`;

resource "aws_subnet" "private" {
  count = 2

  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.\${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "\${var.project_name}-private-\${count.index + 1}"
  }
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "\${var.project_name}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count = 2

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Security Groups
resource "aws_security_group" "database" {
  name_prefix = "\${var.project_name}-db-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.application.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "\${var.project_name}-db-sg"
  }
}

resource "aws_security_group" "application" {
  name_prefix = "\${var.project_name}-app-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "\${var.project_name}-app-sg"
  }
}

# Database Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "\${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "\${var.project_name}-db-subnet-group"
  }
}

${isAurora ? `
# Aurora Cluster
resource "aws_rds_cluster" "main" {
  cluster_identifier      = "\${var.project_name}-aurora-cluster"
  engine                 = "aurora-postgresql"
  engine_version         = var.postgres_version
  database_name          = var.database_name
  master_username        = var.database_username
  master_password        = var.database_password
  backup_retention_period = 7
  preferred_backup_window = "07:00-09:00"
  preferred_maintenance_window = "wed:03:00-wed:04:00"
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]
  skip_final_snapshot    = true

  tags = {
    Name = "\${var.project_name}-aurora-cluster"
  }
}

resource "aws_rds_cluster_instance" "cluster_instances" {
  count              = var.cluster_size
  identifier         = "\${var.project_name}-aurora-\${count.index}"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = var.database_instance_type
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  tags = {
    Name = "\${var.project_name}-aurora-\${count.index}"
  }
}
` : `
# RDS Instance
resource "aws_db_instance" "main" {
  identifier     = "\${var.project_name}-postgres"
  engine         = "postgres"
  engine_version = var.postgres_version
  instance_class = var.database_instance_type
  
  allocated_storage     = var.database_storage
  max_allocated_storage = var.database_max_storage
  storage_type         = "gp3"
  storage_encrypted    = true
  
  db_name  = var.database_name
  username = var.database_username
  password = var.database_password
  
  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window          = "07:00-09:00"
  maintenance_window     = "wed:03:00-wed:04:00"
  
  skip_final_snapshot = true
  deletion_protection = false

  tags = {
    Name = "\${var.project_name}-postgres"
  }
}
`}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}
`;
  }

  private generateCloudFormationParameters(repository: Repository): string {
    const isAurora = repository.databaseVersion.includes('Aurora');
    return `variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "${repository.name}"
}

variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "${this.extractPostgresVersion(repository.databaseVersion)}"
}

variable "database_instance_type" {
  description = "Database instance type"
  type        = string
  default     = "${isAurora ? 'db.r6g.large' : 'db.t3.medium'}"
  
  validation {
    condition = contains([
      ${isAurora ? 
        '"db.r6g.large", "db.r6g.xlarge", "db.r6g.2xlarge", "db.r6g.4xlarge"' :
        '"db.t3.micro", "db.t3.small", "db.t3.medium", "db.t3.large", "db.m6i.large", "db.m6i.xlarge"'
      }
    ], var.database_instance_type)
    error_message = "Invalid database instance type."
  }
}

${isAurora ? `
variable "cluster_size" {
  description = "Number of Aurora instances"
  type        = number
  default     = 2
}
` : `
variable "database_storage" {
  description = "Initial database storage (GB)"
  type        = number
  default     = ${repository.useCases.includes("Real Estate/Property Search") ? "100" : "20"}
}

variable "database_max_storage" {
  description = "Maximum database storage (GB)"
  type        = number
  default     = ${repository.useCases.includes("Real Estate/Property Search") ? "1000" : "100"}
}
`}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "learning"
}

variable "database_username" {
  description = "Database username"
  type        = string
  default     = "postgres"
  sensitive   = true
}

variable "database_password" {
  description = "Database password"
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.database_password) >= 8
    error_message = "Database password must be at least 8 characters long."
  }
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}
`;
  }

  private generateTerraformOutputs(repository: Repository): string {
    const isAurora = repository.databaseVersion.includes('Aurora');
    return `output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

${isAurora ? `
output "aurora_cluster_endpoint" {
  description = "Aurora cluster endpoint"
  value       = aws_rds_cluster.main.endpoint
}

output "aurora_reader_endpoint" {
  description = "Aurora reader endpoint"
  value       = aws_rds_cluster.main.reader_endpoint
}

output "database_connection_string" {
  description = "Database connection string"
  value       = "postgresql://\${var.database_username}:\${var.database_password}@\${aws_rds_cluster.main.endpoint}:5432/\${var.database_name}"
  sensitive   = true
}
` : `
output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "database_connection_string" {
  description = "Database connection string"
  value       = "postgresql://\${var.database_username}:\${var.database_password}@\${aws_db_instance.main.endpoint}:5432/\${var.database_name}"
  sensitive   = true
}
`}

output "database_security_group_id" {
  description = "Database security group ID"
  value       = aws_security_group.database.id
}

output "application_security_group_id" {
  description = "Application security group ID"
  value       = aws_security_group.application.id
}
`;
  }

  private generateDatabaseSetup(repository: Repository): string {
    const isPropertySearch = repository.useCases.includes("Real Estate/Property Search");
    return `-- Database Setup for ${repository.name}
-- ${repository.databaseVersion}

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgrouting;
${isPropertySearch ? 'CREATE EXTENSION IF NOT EXISTS pg_trgm;' : ''}
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create schema
CREATE SCHEMA IF NOT EXISTS learning;
SET search_path TO learning, public;

${isPropertySearch ? `
-- Property search tables
CREATE TABLE learning.properties (
    id SERIAL PRIMARY KEY,
    address TEXT NOT NULL,
    price DECIMAL(12,2),
    bedrooms INTEGER,
    bathrooms DECIMAL(3,1),
    square_feet INTEGER,
    property_type VARCHAR(50),
    listing_status VARCHAR(20),
    geom GEOMETRY(POINT, 4326) NOT NULL,
    listing_date DATE,
    last_updated TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_price CHECK (price > 0),
    CONSTRAINT valid_bedrooms CHECK (bedrooms >= 0),
    CONSTRAINT valid_bathrooms CHECK (bathrooms >= 0),
    CONSTRAINT valid_square_feet CHECK (square_feet > 0)
);

-- Spatial indexes for high-performance queries
CREATE INDEX idx_properties_geom ON learning.properties USING GIST (geom);
CREATE INDEX idx_properties_price ON learning.properties (price);
CREATE INDEX idx_properties_type ON learning.properties (property_type);
CREATE INDEX idx_properties_status ON learning.properties (listing_status);
CREATE INDEX idx_properties_bedrooms ON learning.properties (bedrooms);
CREATE INDEX idx_properties_compound ON learning.properties (property_type, listing_status, price);

-- Cluster table by spatial index for better performance
CLUSTER learning.properties USING idx_properties_geom;

-- Property features table
CREATE TABLE learning.property_features (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES learning.properties(id) ON DELETE CASCADE,
    feature_type VARCHAR(50) NOT NULL,
    feature_value TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_property_features_property_id ON learning.property_features (property_id);
CREATE INDEX idx_property_features_type ON learning.property_features (feature_type);

-- Neighborhoods table
CREATE TABLE learning.neighborhoods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(50) NOT NULL,
    state VARCHAR(2) NOT NULL,
    geom GEOMETRY(POLYGON, 4326) NOT NULL,
    avg_price DECIMAL(12,2),
    property_count INTEGER DEFAULT 0
);

CREATE INDEX idx_neighborhoods_geom ON learning.neighborhoods USING GIST (geom);
CREATE INDEX idx_neighborhoods_name ON learning.neighborhoods (name);
` : `
-- Routing tables
CREATE TABLE learning.road_network (
    id SERIAL PRIMARY KEY,
    name TEXT,
    highway_type VARCHAR(50),
    speed_limit INTEGER,
    oneway BOOLEAN DEFAULT FALSE,
    geom GEOMETRY(LINESTRING, 4326) NOT NULL,
    source_node INTEGER,
    target_node INTEGER,
    cost DOUBLE PRECISION,
    reverse_cost DOUBLE PRECISION
);

CREATE INDEX idx_road_network_geom ON learning.road_network USING GIST (geom);
CREATE INDEX idx_road_network_source ON learning.road_network (source_node);
CREATE INDEX idx_road_network_target ON learning.road_network (target_node);

-- Nodes table for routing
CREATE TABLE learning.road_nodes (
    id SERIAL PRIMARY KEY,
    geom GEOMETRY(POINT, 4326) NOT NULL
);

CREATE INDEX idx_road_nodes_geom ON learning.road_nodes USING GIST (geom);

-- Points of Interest
CREATE TABLE learning.poi (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    geom GEOMETRY(POINT, 4326) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_poi_geom ON learning.poi USING GIST (geom);
CREATE INDEX idx_poi_category ON learning.poi (category);
`}

-- Create materialized views for performance
${isPropertySearch ? `
CREATE MATERIALIZED VIEW learning.property_summary AS
SELECT 
    property_type,
    listing_status,
    COUNT(*) as property_count,
    AVG(price) as avg_price,
    MIN(price) as min_price,
    MAX(price) as max_price,
    AVG(square_feet) as avg_square_feet
FROM learning.properties 
WHERE listing_status = 'Active'
GROUP BY property_type, listing_status;

CREATE UNIQUE INDEX idx_property_summary_unique ON learning.property_summary (property_type, listing_status);
` : `
CREATE MATERIALIZED VIEW learning.road_summary AS
SELECT 
    highway_type,
    COUNT(*) as segment_count,
    SUM(ST_Length(geom::geography)) as total_length_meters,
    AVG(speed_limit) as avg_speed_limit
FROM learning.road_network 
GROUP BY highway_type;

CREATE UNIQUE INDEX idx_road_summary_unique ON learning.road_summary (highway_type);
`}

-- Performance monitoring
CREATE OR REPLACE FUNCTION learning.update_stats() RETURNS void AS $$
BEGIN
    ANALYZE learning.properties;
    ${isPropertySearch ? 'REFRESH MATERIALIZED VIEW learning.property_summary;' : 'REFRESH MATERIALIZED VIEW learning.road_summary;'}
END;
$$ LANGUAGE plpgsql;

-- Create performance monitoring user
CREATE USER readonly_user WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE learning TO readonly_user;
GRANT USAGE ON SCHEMA learning TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA learning TO readonly_user;
`;
  }

  private getModuleTitle(moduleNum: number, isPropertySearch: boolean): string {
    const propertyModules = [
      "PostGIS Fundamentals & Spatial Data Types",
      "Property Data Schema Design", 
      "Spatial Indexing & Performance",
      "Geographic Search Queries",
      "Proximity & Distance Calculations",
      "Polygon-based Area Searches",
      "Real Estate Market Analysis",
      "PropScope Query Optimization",
      "Large Dataset Management (38GB+)",
      "Single-digit Latency Techniques",
      "Advanced Spatial Analytics",
      "Production Deployment & Scaling"
    ];

    const routingModules = [
      "PostGIS Fundamentals",
      "Road Network Setup",
      "Basic Routing Queries", 
      "Advanced Routing",
      "Performance Optimization",
      "Real-world Applications",
      "Integration Patterns",
      "Monitoring & Debugging",
      "Scaling Strategies",
      "Production Deployment"
    ];

    const modules = isPropertySearch ? propertyModules : routingModules;
    return modules[moduleNum - 1] || `Module ${moduleNum}`;
  }

  private extractPostgresVersion(databaseVersion: string): string {
    if (databaseVersion.includes('15')) return '15.4';
    if (databaseVersion.includes('14')) return '14.9';
    if (databaseVersion.includes('13')) return '13.12';
    return '15.4';
  }

  private generateModuleContent(moduleNum: number, repository: Repository, isPropertySearch: boolean): string {
    return `# Module ${moduleNum.toString().padStart(2, '0')}: ${this.getModuleTitle(moduleNum, isPropertySearch)}

## Learning Objectives
- Master ${this.getModuleTitle(moduleNum, isPropertySearch).toLowerCase()}
- Apply techniques to AWS infrastructure
- Understand performance implications at scale

## Prerequisites
${moduleNum > 1 ? `- Completion of Module ${(moduleNum - 1).toString().padStart(2, '0')}` : '- Basic SQL knowledge'}
- AWS account with appropriate permissions
- ${repository.databaseVersion} knowledge

## Content Overview
This module provides comprehensive coverage of ${this.getModuleTitle(moduleNum, isPropertySearch).toLowerCase()} specifically designed for ${repository.language} development on AWS infrastructure.

### Key Topics
1. Implementation patterns
2. Performance optimization
3. AWS best practices
4. Monitoring and debugging

## Hands-on Exercises
See example.${this.getFileExtension(repository.language)} for practical implementations.

## AWS Integration Notes
- Database connection pooling strategies
- Security group configuration
- Performance monitoring with CloudWatch
- Cost optimization techniques
`;
  }

  private generateCodeExample(moduleNum: number, repository: Repository, isPropertySearch: boolean): string {
    if (repository.language === "Python") {
      return this.generatePythonExample(moduleNum, isPropertySearch);
    } else {
      return this.generateJavaScriptExample(moduleNum, isPropertySearch);
    }
  }

  private generatePythonExample(moduleNum: number, isPropertySearch: boolean): string {
    return `#!/usr/bin/env python3
"""
Module ${moduleNum.toString().padStart(2, '0')} - ${isPropertySearch ? 'Property Search' : 'Routing'} Implementation
Educational example for PostGIS and pg_route learning with AWS integration
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import boto3
import os
import time
from typing import List, Dict, Optional

class ${isPropertySearch ? 'PropertySearchEngine' : 'RouteCalculator'}:
    def __init__(self, connection_string: Optional[str] = None):
        self.conn_string = connection_string or os.getenv('DATABASE_URL')
        self.cloudwatch = boto3.client('cloudwatch')
        
    def get_connection(self):
        """Get database connection with connection pooling"""
        return psycopg2.connect(self.conn_string)
    
    ${isPropertySearch ? `
    def search_nearby_properties(self, lat: float, lon: float, radius_meters: int = 1000) -> List[Dict]:
        """
        High-performance property search with spatial indexing
        Target: Sub-10ms response times on AWS infrastructure
        """
        start_time = time.time()
        
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                query = """
                SELECT 
                    id, address, price, bedrooms, bathrooms, square_feet,
                    property_type, listing_status,
                    ST_Distance(geom, ST_SetSRID(ST_Point(%s, %s), 4326)) as distance
                FROM learning.properties 
                WHERE ST_DWithin(
                    geom, 
                    ST_SetSRID(ST_Point(%s, %s), 4326),
                    %s
                )
                AND listing_status = 'Active'
                ORDER BY distance
                LIMIT 50;
                """
                cur.execute(query, (lon, lat, lon, lat, radius_meters))
                results = cur.fetchall()
        
        elapsed_ms = (time.time() - start_time) * 1000
        
        # Send metrics to CloudWatch
        self.send_performance_metric('PropertySearchLatency', elapsed_ms)
        
        print(f"Query completed in {elapsed_ms:.2f}ms")
        return [dict(row) for row in results]
    ` : `
    def find_shortest_path(self, start_lat: float, start_lon: float, 
                          end_lat: float, end_lon: float) -> List[Dict]:
        """
        Calculate shortest path using pgRouting with AWS optimization
        """
        start_time = time.time()
        
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                query = """
                SELECT seq, node, edge, cost, agg_cost,
                       ST_AsGeoJSON(geom) as geometry
                FROM pgr_dijkstra(
                    'SELECT id, source_node as source, target_node as target, cost 
                     FROM learning.road_network WHERE cost > 0',
                    (SELECT id FROM learning.road_nodes ORDER BY 
                     ST_Distance(geom, ST_SetSRID(ST_Point(%s, %s), 4326)) LIMIT 1),
                    (SELECT id FROM learning.road_nodes ORDER BY 
                     ST_Distance(geom, ST_SetSRID(ST_Point(%s, %s), 4326)) LIMIT 1),
                    directed := false
                ) route
                JOIN learning.road_network rn ON route.edge = rn.id;
                """
                cur.execute(query, (start_lon, start_lat, end_lon, end_lat))
                results = cur.fetchall()
        
        elapsed_ms = (time.time() - start_time) * 1000
        self.send_performance_metric('RouteCalculationLatency', elapsed_ms)
        
        return [dict(row) for row in results]
    `}
    
    def send_performance_metric(self, metric_name: str, value: float):
        """Send performance metrics to CloudWatch"""
        try:
            self.cloudwatch.put_metric_data(
                Namespace='LearningApp/Performance',
                MetricData=[
                    {
                        'MetricName': metric_name,
                        'Value': value,
                        'Unit': 'Milliseconds',
                        'Dimensions': [
                            {
                                'Name': 'Environment',
                                'Value': os.getenv('ENVIRONMENT', 'dev')
                            }
                        ]
                    }
                ]
            )
        except Exception as e:
            print(f"Failed to send metric: {e}")

# Example usage
if __name__ == "__main__":
    ${isPropertySearch ? `
    engine = PropertySearchEngine()
    properties = engine.search_nearby_properties(40.7128, -74.0060, 1000)
    print(f"Found {len(properties)} properties")
    ` : `
    calculator = RouteCalculator()
    route = calculator.find_shortest_path(40.7128, -74.0060, 40.7589, -73.9851)
    print(f"Route calculated with {len(route)} segments")
    `}
`;
  }

  private generateJavaScriptExample(moduleNum: number, isPropertySearch: boolean): string {
    return `/**
 * Module ${moduleNum.toString().padStart(2, '0')} - ${isPropertySearch ? 'Property Search' : 'Routing'} Implementation
 * Educational example for PostGIS and pg_route learning with AWS integration
 */

const { Pool } = require('pg');
const AWS = require('aws-sdk');

class ${isPropertySearch ? 'PropertySearchEngine' : 'RouteCalculator'} {
    constructor(connectionConfig) {
        this.pool = new Pool(connectionConfig || {
            connectionString: process.env.DATABASE_URL,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        
        this.cloudwatch = new AWS.CloudWatch();
    }
    
    ${isPropertySearch ? `
    async searchNearbyProperties(lat, lon, radiusMeters = 1000) {
        const startTime = Date.now();
        
        const query = \`
            SELECT 
                id, address, price, bedrooms, bathrooms, square_feet,
                property_type, listing_status,
                ST_Distance(geom, ST_SetSRID(ST_Point($2, $1), 4326)) as distance
            FROM learning.properties 
            WHERE ST_DWithin(
                geom, 
                ST_SetSRID(ST_Point($2, $1), 4326),
                $3
            )
            AND listing_status = 'Active'
            ORDER BY distance
            LIMIT 50
        \`;
        
        try {
            const result = await this.pool.query(query, [lat, lon, radiusMeters]);
            const elapsed = Date.now() - startTime;
            
            // Send metrics to CloudWatch
            await this.sendPerformanceMetric('PropertySearchLatency', elapsed);
            
            console.log(\`Query completed in \${elapsed}ms\`);
            return result.rows;
        } catch (error) {
            console.error('Search failed:', error);
            throw error;
        }
    }
    ` : `
    async findShortestPath(startLat, startLon, endLat, endLon) {
        const startTime = Date.now();
        
        const query = \`
            SELECT seq, node, edge, cost, agg_cost,
                   ST_AsGeoJSON(geom) as geometry
            FROM pgr_dijkstra(
                'SELECT id, source_node as source, target_node as target, cost 
                 FROM learning.road_network WHERE cost > 0',
                (SELECT id FROM learning.road_nodes ORDER BY 
                 ST_Distance(geom, ST_SetSRID(ST_Point($2, $1), 4326)) LIMIT 1),
                (SELECT id FROM learning.road_nodes ORDER BY 
                 ST_Distance(geom, ST_SetSRID(ST_Point($4, $3), 4326)) LIMIT 1),
                directed := false
            ) route
            JOIN learning.road_network rn ON route.edge = rn.id
        \`;
        
        try {
            const result = await this.pool.query(query, [startLat, startLon, endLat, endLon]);
            const elapsed = Date.now() - startTime;
            
            await this.sendPerformanceMetric('RouteCalculationLatency', elapsed);
            
            return result.rows;
        } catch (error) {
            console.error('Route calculation failed:', error);
            throw error;
        }
    }
    `}
    
    async sendPerformanceMetric(metricName, value) {
        try {
            await this.cloudwatch.putMetricData({
                Namespace: 'LearningApp/Performance',
                MetricData: [{
                    MetricName: metricName,
                    Value: value,
                    Unit: 'Milliseconds',
                    Dimensions: [{
                        Name: 'Environment',
                        Value: process.env.ENVIRONMENT || 'dev'
                    }]
                }]
            }).promise();
        } catch (error) {
            console.error('Failed to send metric:', error);
        }
    }
}

// Example usage
async function main() {
    const ${isPropertySearch ? 'engine' : 'calculator'} = new ${isPropertySearch ? 'PropertySearchEngine' : 'RouteCalculator'}();
    
    ${isPropertySearch ? `
    const properties = await engine.searchNearbyProperties(40.7128, -74.0060, 1000);
    console.log(\`Found \${properties.length} properties\`);
    ` : `
    const route = await calculator.findShortestPath(40.7128, -74.0060, 40.7589, -73.9851);
    console.log(\`Route calculated with \${route.length} segments\`);
    `}
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ${isPropertySearch ? 'PropertySearchEngine' : 'RouteCalculator'};
`;
  }

  private generateRequirements(): string {
    return `# Core dependencies
psycopg2-binary==2.9.7
geopandas==0.14.0
shapely==2.0.1
pandas==2.1.0
numpy==1.24.3

# Database and ORM
sqlalchemy==2.0.20
alembic==1.12.0

# Web framework
flask==2.3.3
flask-cors==4.0.0
gunicorn==21.2.0

# AWS SDK
boto3==1.28.62
botocore==1.31.62

# Monitoring and logging
structlog==23.1.0
prometheus-client==0.17.1

# Development tools
pytest==7.4.2
pytest-cov==4.1.0
black==23.7.0
flake8==6.0.0

# Performance
redis==4.6.0
celery==5.3.1
`;
  }

  private generatePackageJson(repository: Repository): string {
    return JSON.stringify({
      name: repository.name.toLowerCase(),
      version: "1.0.0",
      description: `Educational repository for ${repository.useCases.join(", ")} with AWS infrastructure`,
      main: "api/server.js",
      scripts: {
        start: "node api/server.js",
        dev: "nodemon api/server.js",
        test: "jest",
        build: "webpack --mode production",
        deploy: "./deploy.sh"
      },
      dependencies: {
        express: "^4.18.2",
        pg: "^8.11.3",
        "pg-format": "^1.0.4",
        cors: "^2.8.5",
        dotenv: "^16.3.1",
        "aws-sdk": "^2.1463.0",
        winston: "^3.10.0",
        helmet: "^7.0.0",
        "express-rate-limit": "^6.10.0"
      },
      devDependencies: {
        nodemon: "^3.0.1",
        jest: "^29.6.4",
        supertest: "^6.3.3",
        eslint: "^8.47.0",
        prettier: "^3.0.2"
      },
      engines: {
        node: ">=18.0.0"
      }
    }, null, 2);
  }

  private generateDeployScript(repository: Repository): string {
    return `#!/bin/bash
set -e

echo "🚀 Deploying ${repository.name} to AWS..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

# Validate required environment variables
required_vars=("AWS_REGION" "DATABASE_URL" "ENVIRONMENT")
for var in "\${required_vars[@]}"; do
    if [ -z "\${!var}" ]; then
        echo "❌ Error: $var environment variable is required"
        exit 1
    fi
done

echo "📦 Building application..."
${repository.language === "Python" ? `
# Install dependencies
pip install -r requirements.txt

# Run database migrations
python -m alembic upgrade head

# Run tests
python -m pytest tests/ -v
` : `
# Install dependencies
npm ci

# Run tests
npm test

# Build application
npm run build
`}

echo "🗄️ Running database setup..."
psql "$DATABASE_URL" -f database/setup.sql

echo "📊 Updating database statistics..."
psql "$DATABASE_URL" -c "SELECT learning.update_stats();"

echo "☁️ Deploying to AWS..."

# Deploy infrastructure if not exists
if [ ! -d "terraform/.terraform" ]; then
    echo "🏗️ Initializing Terraform..."
    cd terraform
    terraform init
    terraform plan -out=tfplan
    terraform apply tfplan
    cd ..
fi

${repository.language === "Python" ? `
# Deploy Python application (example with AWS Lambda or ECS)
echo "🐍 Deploying Python application..."
# Add your Python deployment commands here
` : `
# Deploy Node.js application (example with AWS Lambda or ECS)
echo "🟨 Deploying Node.js application..."
# Add your Node.js deployment commands here
`}

echo "✅ Deployment completed successfully!"
echo "🔗 Application URL: https://your-app-domain.com"
echo "📈 Monitor performance: https://console.aws.amazon.com/cloudwatch/"
`;
  }

  private generateSetupScript(repository: Repository): string {
    return `#!/bin/bash
set -e

echo "⚙️ Setting up ${repository.name} development environment..."

# Check prerequisites  
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI is required but not installed."; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "❌ PostgreSQL client is required but not installed."; exit 1; }

# Copy environment template
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created .env file from template. Please update with your values."
fi

# Start local database
echo "🐘 Starting local PostgreSQL with PostGIS..."
docker-compose up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until docker-compose exec postgres pg_isready -U postgres; do
    sleep 2
done

# Setup database
echo "🗄️ Setting up database schema..."
docker-compose exec postgres psql -U postgres -d learning -f /docker-entrypoint-initdb.d/setup.sql

# Install dependencies
echo "📦 Installing dependencies..."
${repository.language === "Python" ? `
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
` : `
npm install
`}

# Run initial tests
echo "🧪 Running tests..."
${repository.language === "Python" ? `
python -m pytest tests/ -v
` : `
npm test
`}

echo "✅ Setup completed successfully!"
echo ""
echo "🚀 To start development:"
echo "  1. Update .env with your configuration"
echo "  2. Run: ${repository.language === "Python" ? "python app.py" : "npm run dev"}"
echo "  3. Visit: http://localhost:5000"
echo ""
echo "☁️ To deploy to AWS:"
echo "  1. Configure AWS credentials: aws configure"
echo "  2. Update terraform/terraform.tfvars"
echo "  3. Run: ./deploy.sh"
`;
  }

  private generateEnvExample(repository: Repository): string {
    return `# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/learning

# AWS Configuration
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# Application Settings
ENVIRONMENT=development
PORT=5000
LOG_LEVEL=info

# Security
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# Performance Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090

# Feature Flags
ENABLE_CACHING=true
CACHE_TTL_SECONDS=300

# Database Pool Settings
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
`;
  }

  private generateSampleDataset(repository: Repository): string {
    const isPropertySearch = repository.useCases.includes("Real Estate/Property Search");
    
    if (isPropertySearch) {
      return JSON.stringify({
        type: "FeatureCollection",
        name: "sample_properties",
        features: [
          {
            type: "Feature",
            properties: {
              id: 1,
              address: "123 Main Street, San Francisco, CA 94102",
              price: 1250000,
              bedrooms: 3,
              bathrooms: 2.5,
              squareFeet: 1800,
              propertyType: "Single Family",
              listingStatus: "Active",
              listingDate: "2024-01-15"
            },
            geometry: {
              type: "Point",
              coordinates: [-122.4194, 37.7749]
            }
          },
          {
            type: "Feature", 
            properties: {
              id: 2,
              address: "456 Oak Avenue, San Francisco, CA 94103",
              price: 950000,
              bedrooms: 2,
              bathrooms: 2.0,
              squareFeet: 1200,
              propertyType: "Condo",
              listingStatus: "Active",
              listingDate: "2024-01-18"
            },
            geometry: {
              type: "Point",
              coordinates: [-122.4094, 37.7849]
            }
          }
        ]
      }, null, 2);
    } else {
      return JSON.stringify({
        type: "FeatureCollection",
        name: "sample_roads",
        features: [
          {
            type: "Feature",
            properties: {
              id: 1,
              name: "Broadway",
              highway: "primary",
              speedLimit: 35,
              oneway: false
            },
            geometry: {
              type: "LineString",
              coordinates: [[-122.4194, 37.7749], [-122.4184, 37.7759]]
            }
          },
          {
            type: "Feature",
            properties: {
              id: 2,
              name: "Market Street",
              highway: "trunk",
              speedLimit: 25,
              oneway: false
            },
            geometry: {
              type: "LineString", 
              coordinates: [[-122.4194, 37.7749], [-122.4204, 37.7739]]
            }
          }
        ]
      }, null, 2);
    }
  }

  private generateAPIServer(repository: Repository): string {
    if (repository.language === "Python") {
      return `#!/usr/bin/env python3
"""
Flask API Server for ${repository.name}
Production-ready server with AWS integration
"""

from flask import Flask, request, jsonify, g
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import boto3
import structlog
import os
from datetime import datetime

# Initialize structured logging
logger = structlog.get_logger()

app = Flask(__name__)
CORS(app)

# Configuration
DATABASE_URL = os.getenv('DATABASE_URL')
AWS_REGION = os.getenv('AWS_REGION', 'us-west-2')

# AWS clients
cloudwatch = boto3.client('cloudwatch', region_name=AWS_REGION)

def get_db_connection():
    """Get database connection with error handling"""
    if 'db_conn' not in g:
        g.db_conn = psycopg2.connect(DATABASE_URL)
    return g.db_conn

@app.teardown_appcontext
def close_db(error):
    """Close database connection"""
    db = g.pop('db_conn', None)
    if db is not None:
        db.close()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute('SELECT 1')
        return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 503

@app.route('/api/search', methods=['GET'])
def search_properties():
    """Property search endpoint with performance monitoring"""
    start_time = datetime.utcnow()
    
    try:
        lat = float(request.args.get('lat', 40.7128))
        lon = float(request.args.get('lon', -74.0060))
        radius = int(request.args.get('radius', 1000))
        
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
            SELECT id, address, price, bedrooms, bathrooms, square_feet,
                   property_type, listing_status,
                   ST_Distance(geom, ST_SetSRID(ST_Point(%s, %s), 4326)) as distance
            FROM learning.properties 
            WHERE ST_DWithin(geom, ST_SetSRID(ST_Point(%s, %s), 4326), %s)
            AND listing_status = 'Active'
            ORDER BY distance
            LIMIT 50
            """
            cur.execute(query, (lon, lat, lon, lat, radius))
            results = cur.fetchall()
        
        # Calculate response time
        response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        # Send metrics to CloudWatch
        send_metric('PropertySearchLatency', response_time)
        send_metric('PropertySearchCount', len(results))
        
        logger.info("Property search completed", 
                   lat=lat, lon=lon, radius=radius, 
                   results_count=len(results), 
                   response_time_ms=response_time)
        
        return jsonify({
            'results': [dict(row) for row in results],
            'count': len(results),
            'response_time_ms': response_time
        })
        
    except Exception as e:
        logger.error("Property search failed", error=str(e))
        return jsonify({'error': 'Search failed'}), 500

def send_metric(metric_name, value):
    """Send metric to CloudWatch"""
    try:
        cloudwatch.put_metric_data(
            Namespace='LearningApp/API',
            MetricData=[{
                'MetricName': metric_name,
                'Value': value,
                'Unit': 'Milliseconds' if 'Latency' in metric_name else 'Count',
                'Dimensions': [{
                    'Name': 'Environment',
                    'Value': os.getenv('ENVIRONMENT', 'dev')
                }]
            }]
        )
    except Exception as e:
        logger.warning("Failed to send metric", metric=metric_name, error=str(e))

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('ENVIRONMENT', 'dev') == 'dev'
    app.run(host='0.0.0.0', port=port, debug=debug)
`;
    } else {
      return `/**
 * Express API Server for ${repository.name}
 * Production-ready server with AWS integration
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const AWS = require('aws-sdk');
const winston = require('winston');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Initialize logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'app.log' })
    ]
});

const app = express();
const port = process.env.PORT || 5000;

// AWS configuration
AWS.config.region = process.env.AWS_REGION || 'us-west-2';
const cloudwatch = new AWS.CloudWatch();

// Database connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: parseInt(process.env.DB_POOL_MAX) || 20,
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT) || 30000,
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        
        res.json({ 
            status: 'healthy', 
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({ 
            status: 'unhealthy', 
            error: error.message 
        });
    }
});

// Property search endpoint
app.get('/api/search', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { lat = 40.7128, lon = -74.0060, radius = 1000 } = req.query;
        
        const query = \`
            SELECT id, address, price, bedrooms, bathrooms, square_feet,
                   property_type, listing_status,
                   ST_Distance(geom, ST_SetSRID(ST_Point($2, $1), 4326)) as distance
            FROM learning.properties 
            WHERE ST_DWithin(geom, ST_SetSRID(ST_Point($2, $1), 4326), $3)
            AND listing_status = 'Active'
            ORDER BY distance
            LIMIT 50
        \`;
        
        const result = await pool.query(query, [lat, lon, radius]);
        const responseTime = Date.now() - startTime;
        
        // Send metrics to CloudWatch
        await sendMetric('PropertySearchLatency', responseTime);
        await sendMetric('PropertySearchCount', result.rows.length);
        
        logger.info('Property search completed', {
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            radius: parseInt(radius),
            resultsCount: result.rows.length,
            responseTimeMs: responseTime
        });
        
        res.json({
            results: result.rows,
            count: result.rows.length,
            responseTimeMs: responseTime
        });
        
    } catch (error) {
        logger.error('Property search failed:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Metrics endpoint for Prometheus
app.get('/metrics', (req, res) => {
    // Add Prometheus metrics here
    res.set('Content-Type', 'text/plain');
    res.send('# Metrics endpoint - implement Prometheus metrics here\\n');
});

async function sendMetric(metricName, value) {
    try {
        await cloudwatch.putMetricData({
            Namespace: 'LearningApp/API',
            MetricData: [{
                MetricName: metricName,
                Value: value,
                Unit: metricName.includes('Latency') ? 'Milliseconds' : 'Count',
                Dimensions: [{
                    Name: 'Environment',
                    Value: process.env.ENVIRONMENT || 'dev'
                }]
            }]
        }).promise();
    } catch (error) {
        logger.warn('Failed to send metric:', { metric: metricName, error: error.message });
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    pool.end(() => {
        process.exit(0);
    });
});

app.listen(port, '0.0.0.0', () => {
    logger.info(\`Server running on port \${port}\`);
});
`;
    }
  }

  private generateDockerCompose(repository: Repository): string {
    return `version: '3.8'

services:
  postgres:
    image: postgis/postgis:${this.extractPostgresVersion(repository.databaseVersion)}-3.4
    environment:
      POSTGRES_DB: learning
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/setup.sql:/docker-entrypoint-initdb.d/setup.sql
      - ./database/migrations:/docker-entrypoint-initdb.d/migrations
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - learning_network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - learning_network

  app:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/learning
      - REDIS_URL=redis://redis:6379
      - ENVIRONMENT=development
    ports:
      - "5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - .:/app
      - /app/node_modules
    networks:
      - learning_network

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - learning_network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana:/etc/grafana/provisioning
    networks:
      - learning_network

volumes:
  postgres_data:
  redis_data:
  grafana_data:

networks:
  learning_network:
    driver: bridge
`;
  }

  private generateDockerfile(repository: Repository): string {
    if (repository.language === "Python") {
      return `FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    build-essential \\
    libpq-dev \\
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app \\
    && chown -R app:app /app
USER app

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:5000/health || exit 1

# Start application
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "api.server:app"]
`;
    } else {
      return `FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S app \\
    && adduser -S app -u 1001
RUN chown -R app:app /app
USER app

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:5000/health || exit 1

# Start application
CMD ["node", "api/server.js"]
`;
    }
  }

  private generateDatabaseMigrations(repository: Repository): string {
    const isPropertySearch = repository.useCases.includes("Real Estate/Property Search");
    return `-- Migration 001: Initial Schema
-- Generated for ${repository.name}
-- ${new Date().toISOString()}

BEGIN;

-- Add migration tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT NOW()
);

-- Insert this migration
INSERT INTO schema_migrations (version) VALUES ('001_initial_schema')
ON CONFLICT (version) DO NOTHING;

${isPropertySearch ? `
-- Sample property data for testing
INSERT INTO learning.properties (address, price, bedrooms, bathrooms, square_feet, property_type, listing_status, geom, listing_date) VALUES
('123 Market Street, San Francisco, CA 94102', 1250000, 3, 2.5, 1800, 'Single Family', 'Active', ST_SetSRID(ST_Point(-122.4194, 37.7749), 4326), '2024-01-15'),
('456 Mission Street, San Francisco, CA 94103', 950000, 2, 2.0, 1200, 'Condo', 'Active', ST_SetSRID(ST_Point(-122.4094, 37.7849), 4326), '2024-01-18'),
('789 Broadway, San Francisco, CA 94133', 2100000, 4, 3.5, 2500, 'Single Family', 'Active', ST_SetSRID(ST_Point(-122.4294, 37.7949), 4326), '2024-01-20'),
('321 Valencia Street, San Francisco, CA 94110', 850000, 2, 1.5, 1100, 'Condo', 'Pending', ST_SetSRID(ST_Point(-122.4194, 37.7649), 4326), '2024-01-22'),
('654 Fillmore Street, San Francisco, CA 94117', 1850000, 3, 2.5, 2000, 'Townhouse', 'Active', ST_SetSRID(ST_Point(-122.4394, 37.7749), 4326), '2024-01-25');

-- Sample neighborhoods
INSERT INTO learning.neighborhoods (name, city, state, geom, avg_price, property_count) VALUES
('SOMA', 'San Francisco', 'CA', ST_SetSRID(ST_GeomFromText('POLYGON((-122.42 37.77, -122.40 37.77, -122.40 37.78, -122.42 37.78, -122.42 37.77))'), 4326), 1100000, 250),
('Mission', 'San Francisco', 'CA', ST_SetSRID(ST_GeomFromText('POLYGON((-122.43 37.75, -122.41 37.75, -122.41 37.77, -122.43 37.77, -122.43 37.75))'), 4326), 950000, 180);
` : `
-- Sample road network data
INSERT INTO learning.road_network (name, highway_type, speed_limit, oneway, geom, source_node, target_node, cost) VALUES
('Market Street', 'primary', 25, false, ST_SetSRID(ST_GeomFromText('LINESTRING(-122.4194 37.7749, -122.4184 37.7759)'), 4326), 1, 2, 1.0),
('Mission Street', 'primary', 25, false, ST_SetSRID(ST_GeomFromText('LINESTRING(-122.4194 37.7749, -122.4204 37.7739)'), 4326), 1, 3, 1.0),
('Broadway', 'secondary', 35, false, ST_SetSRID(ST_GeomFromText('LINESTRING(-122.4184 37.7759, -122.4174 37.7769)'), 4326), 2, 4, 1.2);

-- Sample nodes
INSERT INTO learning.road_nodes (id, geom) VALUES
(1, ST_SetSRID(ST_Point(-122.4194, 37.7749), 4326)),
(2, ST_SetSRID(ST_Point(-122.4184, 37.7759), 4326)),
(3, ST_SetSRID(ST_Point(-122.4204, 37.7739), 4326)),
(4, ST_SetSRID(ST_Point(-122.4174, 37.7769), 4326));

-- Sample POIs
INSERT INTO learning.poi (name, category, geom) VALUES
('Union Square', 'landmark', ST_SetSRID(ST_Point(-122.4077, 37.7879), 4326)),
('Ferry Building', 'landmark', ST_SetSRID(ST_Point(-122.3934, 37.7955), 4326)),
('Coit Tower', 'landmark', ST_SetSRID(ST_Point(-122.4058, 37.8024), 4326));
`}

-- Update statistics
ANALYZE;

COMMIT;
`;
  }

  private generatePyprojectToml(repository: Repository): string {
    return `[build-system]
requires = ["setuptools>=45", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "${repository.name}"
version = "1.0.0"
description = "Educational repository for ${repository.useCases.join(", ")} with AWS infrastructure"
authors = [
    {name = "Learning Team", email = "learning@example.com"},
]
license = {text = "MIT"}
readme = "README.md"
requires-python = ">=3.11"
classifiers = [
    "Development Status :: 4 - Beta",
    "Intended Audience :: Education",
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.11",
    "Topic :: Database",
    "Topic :: Scientific/Engineering :: GIS",
]

dependencies = [
    "psycopg2-binary>=2.9.7",
    "geopandas>=0.14.0",
    "shapely>=2.0.1",
    "pandas>=2.1.0",
    "numpy>=1.24.3",
    "sqlalchemy>=2.0.20",
    "alembic>=1.12.0",
    "flask>=2.3.3",
    "flask-cors>=4.0.0",
    "gunicorn>=21.2.0",
    "boto3>=1.28.62",
    "structlog>=23.1.0",
    "prometheus-client>=0.17.1",
    "redis>=4.6.0",
    "celery>=5.3.1",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.2",
    "pytest-cov>=4.1.0",
    "black>=23.7.0",
    "flake8>=6.0.0",
    "mypy>=1.5.1",
    "pre-commit>=3.3.3",
]

[project.urls]
Homepage = "https://github.com/example/${repository.name}"
Documentation = "https://github.com/example/${repository.name}#readme"
Repository = "https://github.com/example/${repository.name}"

[tool.black]
line-length = 88
target-version = ['py311']

[tool.pytest.ini_options]
minversion = "6.0"
addopts = "-ra -q --strict-markers --cov=src --cov-report=term-missing"
testpaths = ["tests"]

[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
`;
  }

  private generateCloudFormationMain(repository: Repository): string {
    const isAurora = repository.databaseType === "Aurora";
    const postgresVersion = this.extractPostgresVersion(repository.databaseVersion);
    
    return `AWSTemplateFormatVersion: '2010-09-09'
Description: 'Complete AWS infrastructure for ${repository.name} - pg_route and PostGIS learning environment'

Parameters:
  ProjectName:
    Type: String
    Default: ${repository.name}
    Description: Name of the project for resource naming
    
  Environment:
    Type: String
    Default: development
    AllowedValues: [development, staging, production]
    Description: Environment for deployment
    
  DatabaseInstanceType:
    Type: String
    Default: ${repository.instanceType}
    AllowedValues: 
      - db.t3.micro
      - db.t3.small
      - db.t3.medium
      - db.t3.large
      - db.m6i.large
      - db.m6i.xlarge
      - db.r6g.large
      - db.r6g.xlarge
    Description: Database instance type
    
  DatabaseName:
    Type: String
    Default: pgroute_db
    Description: PostgreSQL database name
    
  DatabaseUsername:
    Type: String
    Default: postgres
    Description: PostgreSQL master username
    
  DatabasePassword:
    Type: String
    NoEcho: true
    MinLength: 8
    Description: PostgreSQL master password (minimum 8 characters)

Resources:
  # VPC Stack
  VPCStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: vpc.yaml
      Parameters:
        ProjectName: !Ref ProjectName
        Environment: !Ref Environment

  # Security Stack  
  SecurityStack:
    Type: AWS::CloudFormation::Stack
    DependsOn: VPCStack
    Properties:
      TemplateURL: security.yaml
      Parameters:
        ProjectName: !Ref ProjectName
        Environment: !Ref Environment
        VPCId: !GetAtt VPCStack.Outputs.VPCId
        VPCCidr: !GetAtt VPCStack.Outputs.VPCCidr

  # Database Stack
  DatabaseStack:
    Type: AWS::CloudFormation::Stack
    DependsOn: [VPCStack, SecurityStack]
    Properties:
      TemplateURL: database.yaml
      Parameters:
        ProjectName: !Ref ProjectName
        Environment: !Ref Environment
        DatabaseType: ${repository.databaseType}
        DatabaseInstanceType: !Ref DatabaseInstanceType
        DatabaseName: !Ref DatabaseName
        DatabaseUsername: !Ref DatabaseUsername
        DatabasePassword: !Ref DatabasePassword
        VPCId: !GetAtt VPCStack.Outputs.VPCId
        PrivateSubnetIds: !GetAtt VPCStack.Outputs.PrivateSubnetIds
        DatabaseSecurityGroupId: !GetAtt SecurityStack.Outputs.DatabaseSecurityGroupId

  # Monitoring Stack
  MonitoringStack:
    Type: AWS::CloudFormation::Stack
    DependsOn: DatabaseStack
    Properties:
      TemplateURL: monitoring.yaml
      Parameters:
        ProjectName: !Ref ProjectName
        Environment: !Ref Environment
        DatabaseIdentifier: !GetAtt DatabaseStack.Outputs.DatabaseIdentifier

Outputs:
  VPCId:
    Description: VPC ID
    Value: !GetAtt VPCStack.Outputs.VPCId
    Export:
      Name: !Sub '\${AWS::StackName}-VPCId'
      
  DatabaseEndpoint:
    Description: Database endpoint
    Value: !GetAtt DatabaseStack.Outputs.DatabaseEndpoint
    Export:
      Name: !Sub '\${AWS::StackName}-DatabaseEndpoint'
      
  DatabasePort:
    Description: Database port
    Value: !GetAtt DatabaseStack.Outputs.DatabasePort
    Export:
      Name: !Sub '\${AWS::StackName}-DatabasePort'
      
  AlertsTopicArn:
    Description: SNS topic for alerts
    Value: !GetAtt MonitoringStack.Outputs.AlertsTopicArn
    Export:
      Name: !Sub '\${AWS::StackName}-AlertsTopicArn'`;
  }

  private generateCloudFormationParameters(repository: Repository): string {
    return `{
  "ProjectName": "${repository.name}",
  "Environment": "development",
  "DatabaseInstanceType": "${repository.instanceType}",
  "DatabaseName": "pgroute_db",
  "DatabaseUsername": "postgres",
  "DatabasePassword": "ChangeMe123!"
}`;
  }

  private generateCloudFormationVPC(repository: Repository): string {
    return `AWSTemplateFormatVersion: '2010-09-09'
Description: 'VPC infrastructure for pg_route and PostGIS'

Parameters:
  ProjectName:
    Type: String
    Description: Name of the project
    
  Environment:
    Type: String
    Description: Environment name

Resources:
  # VPC
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-vpc'
        - Key: Environment
          Value: !Ref Environment

  # Internet Gateway
  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-igw'

  # Attach Gateway to VPC
  InternetGatewayAttachment:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      InternetGatewayId: !Ref InternetGateway
      VpcId: !Ref VPC

  # Public Subnets
  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: 10.0.1.0/24
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-public-subnet-1'
        - Key: Type
          Value: Public

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: 10.0.2.0/24
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-public-subnet-2'
        - Key: Type
          Value: Public

  # Private Subnets
  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: 10.0.10.0/24
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-private-subnet-1'
        - Key: Type
          Value: Private

  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: 10.0.11.0/24
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-private-subnet-2'
        - Key: Type
          Value: Private

  # NAT Gateways
  NatGateway1EIP:
    Type: AWS::EC2::EIP
    DependsOn: InternetGatewayAttachment
    Properties:
      Domain: vpc
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-nat-eip-1'

  NatGateway2EIP:
    Type: AWS::EC2::EIP
    DependsOn: InternetGatewayAttachment
    Properties:
      Domain: vpc
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-nat-eip-2'

  NatGateway1:
    Type: AWS::EC2::NatGateway
    Properties:
      AllocationId: !GetAtt NatGateway1EIP.AllocationId
      SubnetId: !Ref PublicSubnet1
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-nat-1'

  NatGateway2:
    Type: AWS::EC2::NatGateway
    Properties:
      AllocationId: !GetAtt NatGateway2EIP.AllocationId
      SubnetId: !Ref PublicSubnet2
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-nat-2'

  # Route Tables
  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-public-rt'

  DefaultPublicRoute:
    Type: AWS::EC2::Route
    DependsOn: InternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  PublicSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PublicRouteTable
      SubnetId: !Ref PublicSubnet1

  PublicSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PublicRouteTable
      SubnetId: !Ref PublicSubnet2

  # Private Route Tables
  PrivateRouteTable1:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-private-rt-1'

  DefaultPrivateRoute1:
    Type: AWS::EC2::Route
    Properties:
      RouteTableId: !Ref PrivateRouteTable1
      DestinationCidrBlock: 0.0.0.0/0
      NatGatewayId: !Ref NatGateway1

  PrivateSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PrivateRouteTable1
      SubnetId: !Ref PrivateSubnet1

  PrivateRouteTable2:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-private-rt-2'

  DefaultPrivateRoute2:
    Type: AWS::EC2::Route
    Properties:
      RouteTableId: !Ref PrivateRouteTable2
      DestinationCidrBlock: 0.0.0.0/0
      NatGatewayId: !Ref NatGateway2

  PrivateSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PrivateRouteTable2
      SubnetId: !Ref PrivateSubnet2

Outputs:
  VPCId:
    Description: A reference to the created VPC
    Value: !Ref VPC

  VPCCidr:
    Description: CIDR block of the VPC
    Value: !GetAtt VPC.CidrBlock

  PublicSubnetIds:
    Description: A list of the public subnets
    Value: !Join [",", [!Ref PublicSubnet1, !Ref PublicSubnet2]]

  PrivateSubnetIds:
    Description: A list of the private subnets
    Value: !Join [",", [!Ref PrivateSubnet1, !Ref PrivateSubnet2]]

  InternetGatewayId:
    Description: A reference to the Internet Gateway
    Value: !Ref InternetGateway`;
  }

  private generateCloudFormationDatabase(repository: Repository): string {
    const isAurora = repository.databaseType === "Aurora";
    const postgresVersion = this.extractPostgresVersion(repository.databaseVersion);
    
    if (isAurora) {
      return `AWSTemplateFormatVersion: '2010-09-09'
Description: 'Aurora PostgreSQL cluster for pg_route and PostGIS'

Parameters:
  ProjectName:
    Type: String
  Environment:
    Type: String
  DatabaseType:
    Type: String
  DatabaseInstanceType:
    Type: String
  DatabaseName:
    Type: String
  DatabaseUsername:
    Type: String
  DatabasePassword:
    Type: String
    NoEcho: true
  VPCId:
    Type: String
  PrivateSubnetIds:
    Type: CommaDelimitedList
  DatabaseSecurityGroupId:
    Type: String

Resources:
  # Database Subnet Group
  DatabaseSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Subnet group for Aurora PostgreSQL cluster
      SubnetIds: !Ref PrivateSubnetIds
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-subnet-group'

  # Aurora Cluster
  DatabaseCluster:
    Type: AWS::RDS::DBCluster
    Properties:
      DBClusterIdentifier: !Sub '\${ProjectName}-cluster'
      Engine: aurora-postgresql
      EngineVersion: '${postgresVersion}'
      DatabaseName: !Ref DatabaseName
      MasterUsername: !Ref DatabaseUsername
      MasterUserPassword: !Ref DatabasePassword
      VpcSecurityGroupIds:
        - !Ref DatabaseSecurityGroupId
      DBSubnetGroupName: !Ref DatabaseSubnetGroup
      BackupRetentionPeriod: 7
      PreferredBackupWindow: "03:00-04:00"
      PreferredMaintenanceWindow: "sun:04:00-sun:05:00"
      DeletionProtection: false
      StorageEncrypted: true
      EnableCloudwatchLogsExports:
        - postgresql
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-cluster'
        - Key: Environment
          Value: !Ref Environment

  # Aurora Instances
  DatabaseInstance1:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Sub '\${ProjectName}-instance-1'
      DBClusterIdentifier: !Ref DatabaseCluster
      DBInstanceClass: !Ref DatabaseInstanceType
      Engine: aurora-postgresql
      PubliclyAccessible: false
      EnablePerformanceInsights: true
      PerformanceInsightsRetentionPeriod: 7
      MonitoringInterval: 60
      MonitoringRoleArn: !GetAtt RDSMonitoringRole.Arn
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-instance-1'

  DatabaseInstance2:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Sub '\${ProjectName}-instance-2'
      DBClusterIdentifier: !Ref DatabaseCluster
      DBInstanceClass: !Ref DatabaseInstanceType
      Engine: aurora-postgresql
      PubliclyAccessible: false
      EnablePerformanceInsights: true
      PerformanceInsightsRetentionPeriod: 7
      MonitoringInterval: 60
      MonitoringRoleArn: !GetAtt RDSMonitoringRole.Arn
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-instance-2'

  # RDS Monitoring Role
  RDSMonitoringRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub '\${ProjectName}-rds-monitoring-role'
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Sid: ''
            Effect: Allow
            Principal:
              Service: monitoring.rds.amazonaws.com
            Action: 'sts:AssumeRole'
      ManagedPolicyArns:
        - 'arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole'
      Path: /

Outputs:
  DatabaseEndpoint:
    Description: Aurora cluster endpoint
    Value: !GetAtt DatabaseCluster.Endpoint.Address

  DatabasePort:
    Description: Database port
    Value: !GetAtt DatabaseCluster.Endpoint.Port

  DatabaseIdentifier:
    Description: Database cluster identifier
    Value: !Ref DatabaseCluster`;
    } else {
      return `AWSTemplateFormatVersion: '2010-09-09'
Description: 'RDS PostgreSQL instance for pg_route and PostGIS'

Parameters:
  ProjectName:
    Type: String
  Environment:
    Type: String
  DatabaseType:
    Type: String
  DatabaseInstanceType:
    Type: String
  DatabaseName:
    Type: String
  DatabaseUsername:
    Type: String
  DatabasePassword:
    Type: String
    NoEcho: true
  VPCId:
    Type: String
  PrivateSubnetIds:
    Type: CommaDelimitedList
  DatabaseSecurityGroupId:
    Type: String

Resources:
  # Database Subnet Group
  DatabaseSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Subnet group for RDS PostgreSQL
      SubnetIds: !Ref PrivateSubnetIds
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-subnet-group'

  # RDS Instance
  DatabaseInstance:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Sub '\${ProjectName}-database'
      AllocatedStorage: 100
      MaxAllocatedStorage: 1000
      StorageType: gp3
      StorageEncrypted: true
      Engine: postgres
      EngineVersion: '${postgresVersion}'
      DBInstanceClass: !Ref DatabaseInstanceType
      DBName: !Ref DatabaseName
      MasterUsername: !Ref DatabaseUsername
      MasterUserPassword: !Ref DatabasePassword
      VPCSecurityGroups:
        - !Ref DatabaseSecurityGroupId
      DBSubnetGroupName: !Ref DatabaseSubnetGroup
      BackupRetentionPeriod: 7
      PreferredBackupWindow: "03:00-04:00"
      PreferredMaintenanceWindow: "sun:04:00-sun:05:00"
      DeletionProtection: false
      EnablePerformanceInsights: true
      PerformanceInsightsRetentionPeriod: 7
      MonitoringInterval: 60
      MonitoringRoleArn: !GetAtt RDSMonitoringRole.Arn
      EnableCloudwatchLogsExports:
        - postgresql
        - upgrade
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-database'
        - Key: Environment
          Value: !Ref Environment

  # RDS Monitoring Role
  RDSMonitoringRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub '\${ProjectName}-rds-monitoring-role'
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Sid: ''
            Effect: Allow
            Principal:
              Service: monitoring.rds.amazonaws.com
            Action: 'sts:AssumeRole'
      ManagedPolicyArns:
        - 'arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole'
      Path: /

Outputs:
  DatabaseEndpoint:
    Description: RDS instance endpoint
    Value: !GetAtt DatabaseInstance.Endpoint.Address

  DatabasePort:
    Description: Database port
    Value: !GetAtt DatabaseInstance.Endpoint.Port

  DatabaseIdentifier:
    Description: Database instance identifier
    Value: !Ref DatabaseInstance`;
    }
  }

  private generateCloudFormationSecurity(repository: Repository): string {
    return `AWSTemplateFormatVersion: '2010-09-09'
Description: 'Security groups for pg_route and PostGIS infrastructure'

Parameters:
  ProjectName:
    Type: String
  Environment:
    Type: String
  VPCId:
    Type: String
  VPCCidr:
    Type: String

Resources:
  # Database Security Group
  DatabaseSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub '\${ProjectName}-database-sg'
      GroupDescription: Security group for PostgreSQL database
      VpcId: !Ref VPCId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 5432
          ToPort: 5432
          CidrIp: !Ref VPCCidr
          Description: PostgreSQL access from VPC
      SecurityGroupEgress:
        - IpProtocol: -1
          CidrIp: 0.0.0.0/0
          Description: All outbound traffic
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-database-sg'
        - Key: Environment
          Value: !Ref Environment

  # Application Security Group
  ApplicationSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub '\${ProjectName}-application-sg'
      GroupDescription: Security group for application servers
      VpcId: !Ref VPCId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
          Description: HTTP access
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
          Description: HTTPS access
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: !Ref VPCCidr
          Description: SSH access from VPC
      SecurityGroupEgress:
        - IpProtocol: -1
          CidrIp: 0.0.0.0/0
          Description: All outbound traffic
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-application-sg'
        - Key: Environment
          Value: !Ref Environment

Outputs:
  DatabaseSecurityGroupId:
    Description: ID of the database security group
    Value: !Ref DatabaseSecurityGroup

  ApplicationSecurityGroupId:
    Description: ID of the application security group
    Value: !Ref ApplicationSecurityGroup`;
  }

  private generateDemoScript(repository: Repository): string {
    const useCaseType = repository.useCases[0];
    const language = repository.language;
    
    const scriptContent = {
      "pg_route/Transportation": `# Demo Script: pg_route Transportation Demo

## Overview
This demo showcases PostgreSQL with pg_route extension for transportation routing and logistics optimization.

## Demo Flow (15-20 minutes)

### 1. Introduction (2 minutes)
- "Today I'll demonstrate PostgreSQL's routing capabilities using the pg_route extension"
- "We'll solve real transportation challenges with geospatial routing algorithms"

### 2. Infrastructure Setup (3 minutes)
**Key Highlights:**
- Show CloudFormation template for AWS infrastructure
- Emphasize production-ready setup with VPC, security groups
- Point out auto-scaling and monitoring capabilities

**Demo Points:**
\`\`\`bash
# Show infrastructure components
aws cloudformation describe-stacks --stack-name pgroute-demo
\`\`\`

### 3. Database Capabilities (5 minutes)
**Show pg_route Features:**
- Dijkstra shortest path algorithm
- Turn restriction support
- One-to-many routing
- Traveling salesman problem (TSP)

**Live Demo:**
\`\`\`sql
-- Show loaded transportation network
SELECT count(*) FROM ways;
SELECT * FROM ways LIMIT 5;

-- Demonstrate shortest path routing
SELECT * FROM pgr_dijkstra(
  'SELECT gid as id, source, target, length as cost FROM ways',
  1, 100, directed := false
);
\`\`\`

### 4. Application Demo (7 minutes)
**${language} Application Features:**
- Interactive route planning interface
- Real-time routing calculations
- Multiple destination optimization
- Turn-by-turn directions

**Customer Value Points:**
- Reduces delivery time by 15-25%
- Optimizes fuel consumption
- Scales to handle millions of routes
- Enterprise-grade performance

### 5. Performance & Scaling (3 minutes)
- Show query performance metrics
- Demonstrate concurrent route calculations
- Highlight AWS RDS scaling capabilities

## Technical Talking Points
- PostgreSQL + pg_route handles complex routing scenarios
- Production-ready infrastructure with AWS
- ${language} provides excellent PostgreSQL integration
- Extensible for custom routing algorithms
`,

      "PostGIS/Geospatial Analysis": `# Demo Script: PostGIS Geospatial Analysis Demo

## Overview
Demonstrate PostgreSQL with PostGIS for advanced geospatial data analysis and visualization.

## Demo Flow (15-20 minutes)

### 1. Introduction (2 minutes)
- "Today I'll show PostgreSQL's geospatial capabilities with PostGIS"
- "We'll analyze real geospatial data and create spatial insights"

### 2. Infrastructure Overview (3 minutes)
**Key Highlights:**
- CloudFormation-deployed AWS infrastructure
- PostGIS-enabled PostgreSQL database
- Scalable compute and storage
- Built-in monitoring and backups

### 3. PostGIS Capabilities (6 minutes)
**Demonstrate Core Features:**
\`\`\`sql
-- Show loaded geospatial data
SELECT ST_AsText(geom), name FROM locations LIMIT 3;

-- Spatial relationships
SELECT a.name, b.name, ST_Distance(a.geom, b.geom) as distance
FROM locations a, locations b 
WHERE a.id != b.id AND ST_DWithin(a.geom, b.geom, 1000);

-- Buffer analysis
SELECT name, ST_Area(ST_Buffer(geom, 500)) as buffer_area
FROM locations;

-- Spatial aggregation
SELECT ST_AsText(ST_Centroid(ST_Union(geom))) as center_point
FROM locations;
\`\`\`

### 4. ${language} Application Demo (6 minutes)
**Show Interactive Features:**
- Real-time spatial queries
- Dynamic map visualization
- Spatial analytics dashboard
- Geographic data import/export

**Business Value:**
- Location intelligence for decision making
- Spatial analysis reduces manual work by 80%
- Real-time geospatial processing
- Industry-standard spatial functions

### 5. Advanced Features (3 minutes)
- Spatial indexing performance
- Raster data processing
- 3D spatial analysis
- Integration with mapping services

## Customer Impact
- Faster geospatial analysis
- Reduced infrastructure costs
- Scalable to petabytes of spatial data
- Industry-standard SQL interface
`,

      "Real Estate/Property Search": `# Demo Script: Real Estate Property Search Demo

## Overview
Showcase PostgreSQL with PostGIS for sophisticated property search and real estate analytics.

## Demo Flow (15-20 minutes)

### 1. Introduction (2 minutes)
- "I'll demonstrate a complete property search solution using PostgreSQL and PostGIS"
- "This covers proximity search, market analysis, and property recommendations"

### 2. System Architecture (3 minutes)
**Infrastructure Highlights:**
- AWS CloudFormation deployment
- PostGIS-enabled PostgreSQL database
- Auto-scaling web application
- Real-time property data processing

### 3. Property Search Features (6 minutes)
**Core Functionality Demo:**
\`\`\`sql
-- Properties within radius
SELECT p.address, p.price, p.bedrooms
FROM properties p
WHERE ST_DWithin(
  p.geom::geography,
  ST_Point(-122.4194, 37.7749)::geography,
  1000  -- 1km radius
);

-- Price analysis by neighborhood
SELECT 
  neighborhood,
  AVG(price) as avg_price,
  COUNT(*) as property_count
FROM properties 
GROUP BY neighborhood;

-- Schools proximity impact
SELECT p.address, p.price, s.name as nearest_school,
       ST_Distance(p.geom::geography, s.geom::geography) as distance_meters
FROM properties p
CROSS JOIN LATERAL (
  SELECT name, geom
  FROM schools s
  ORDER BY p.geom <-> s.geom
  LIMIT 1
) s;
\`\`\`

### 4. ${language} Application Demo (5 minutes)
**Interactive Features:**
- Map-based property search
- Filter by amenities and proximity
- Market trend visualization
- Property recommendation engine

**Business Value:**
- 40% faster property discovery
- Improved customer satisfaction
- Data-driven pricing insights
- Automated market analysis

### 5. Advanced Analytics (4 minutes)
- Commute time analysis
- Market trend predictions
- Investment opportunity scoring
- Demographic correlation analysis

## ROI Demonstration
- Reduced search time from hours to minutes
- Increased conversion rates by 25%
- Automated valuation accuracy 95%+
- Scalable to millions of properties
`,

      "PostgreSQL Replicator": `# Demo Script: PostgreSQL Replicator Demo

## Overview
Demonstrate PostgreSQL's replication capabilities for high availability and disaster recovery.

## Demo Flow (15-20 minutes)

### 1. Introduction (2 minutes)
- "Today I'll show PostgreSQL's enterprise replication features"
- "We'll cover streaming replication, logical replication, and failover scenarios"

### 2. Replication Architecture (4 minutes)
**Infrastructure Overview:**
- Primary-replica setup via CloudFormation
- Cross-region replication configuration
- Automated failover mechanisms
- Monitoring and alerting

### 3. Streaming Replication Demo (5 minutes)
**Show Live Replication:**
\`\`\`sql
-- On primary server
SELECT client_addr, state, sync_state 
FROM pg_stat_replication;

-- Show replication lag
SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));

-- Demonstrate real-time sync
INSERT INTO demo_table VALUES (gen_random_uuid(), 'Demo data', now());
\`\`\`

### 4. Logical Replication Features (4 minutes)
**Advanced Capabilities:**
- Selective table replication
- Cross-version replication
- Real-time data synchronization
- Zero-downtime migrations

\`\`\`sql
-- Create publication
CREATE PUBLICATION demo_pub FOR ALL TABLES;

-- Show replication slots
SELECT slot_name, plugin, slot_type, active 
FROM pg_replication_slots;
\`\`\`

### 5. Failover Simulation (5 minutes)
**Disaster Recovery Demo:**
- Simulate primary failure
- Automatic replica promotion
- Application reconnection
- Data consistency verification

## Business Benefits
- 99.99% uptime guarantee
- Zero data loss with synchronous replication
- Read scaling across multiple replicas
- Geographic disaster recovery
- Seamless maintenance operations

## Technical Advantages
- Built-in PostgreSQL feature (no additional licensing)
- Sub-second failover times
- Conflict-free logical replication
- Monitoring and automation ready
`,

      "Data Migration": `# Demo Script: PostgreSQL Data Migration Demo

## Overview
Showcase comprehensive data migration strategies and tools for PostgreSQL.

## Demo Flow (15-20 minutes)

### 1. Introduction (2 minutes)
- "I'll demonstrate enterprise-grade data migration to PostgreSQL"
- "Covering heterogeneous migrations, validation, and zero-downtime strategies"

### 2. Migration Architecture (3 minutes)
**Infrastructure Components:**
- CloudFormation-deployed migration environment
- Source and target PostgreSQL instances
- Migration monitoring and validation tools
- Rollback and recovery mechanisms

### 3. Schema Migration Demo (5 minutes)
**Show Migration Process:**
\`\`\`sql
-- Schema comparison
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Data type mapping validation
SELECT 'Oracle NUMBER' as source_type, 'PostgreSQL NUMERIC' as target_type;

-- Constraint migration
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'migrated_table'::regclass;
\`\`\`

### 4. Data Migration Process (6 minutes)
**Live Migration Demo:**
- Bulk data transfer
- Incremental synchronization
- Data validation and verification
- Performance optimization

\`\`\`sql
-- Validate row counts
SELECT 'source_table' as table_name, count(*) as row_count FROM source_table
UNION ALL
SELECT 'target_table' as table_name, count(*) as row_count FROM target_table;

-- Data integrity checks
SELECT column_name, 
       count(*) as total_rows,
       count(column_name) as non_null_rows
FROM target_table;
\`\`\`

### 5. ${language} Migration Tools (4 minutes)
**Application Integration:**
- Connection string updates
- SQL compatibility layer
- Performance benchmarking
- Monitoring dashboard

## Migration Benefits
- 50-80% cost reduction vs proprietary databases
- Improved performance and scalability
- Enhanced security and compliance
- Modern feature set and extensibility

## Success Metrics
- Zero data loss guarantee
- 99.9% migration accuracy
- Minimal downtime (typically < 4 hours)
- Performance improvement 20-40%
- ROI achieved within 6-12 months
`
    };

    return scriptContent[useCaseType] || scriptContent["PostGIS/Geospatial Analysis"];
  }

  private generatePresentationGuide(repository: Repository): string {
    const useCaseType = repository.useCases[0];
    
    return `# Presentation Guide: ${repository.name}

## Pre-Demo Checklist (30 minutes before)

### Technical Setup
- [ ] Verify AWS infrastructure is running
- [ ] Test database connectivity
- [ ] Confirm sample data is loaded
- [ ] Check application accessibility
- [ ] Prepare demo environment reset

### Presentation Materials
- [ ] Customer use case research completed
- [ ] Technical requirements gathered
- [ ] ROI calculations prepared
- [ ] Competitive comparison ready
- [ ] Follow-up action items identified

## Demo Environment
- **Database**: ${repository.databaseVersion}
- **Language**: ${repository.language}
- **Use Case**: ${useCaseType}
- **Infrastructure**: AWS CloudFormation
- **Demo Duration**: 15-20 minutes + Q&A

## Key Talking Points

### Business Value
- Reduced operational costs
- Improved performance and scalability
- Enhanced data insights and analytics
- Faster time-to-market for applications
- Enterprise-grade reliability and security

### Technical Advantages
- Open-source with no vendor lock-in
- Rich ecosystem of extensions
- ACID compliance and data integrity
- Advanced indexing and query optimization
- Horizontal and vertical scaling options

### PostgreSQL Differentiators
- Most advanced open-source database
- Superior handling of complex queries
- Extensible architecture
- Strong community and enterprise support
- Proven in production at scale

## Common Questions & Responses

### Q: "How does this compare to [competitor]?"
**A:** PostgreSQL offers superior price-performance ratio with enterprise features at fraction of the cost. No licensing restrictions, extensive ecosystem, and proven scalability.

### Q: "What about data migration complexity?"
**A:** We provide comprehensive migration tools and expertise. Typical migrations complete with 99.9% accuracy and minimal downtime.

### Q: "How do you handle support and maintenance?"
**A:** Multiple support options available from community to enterprise 24/7 support. Large ecosystem of certified professionals and managed service providers.

### Q: "What about performance at scale?"
**A:** PostgreSQL powers some of the world's largest applications. Horizontal scaling through partitioning and read replicas. Vertical scaling to hundreds of cores and terabytes of RAM.

## Next Steps Framework

### Immediate Actions
1. Schedule technical deep-dive session
2. Provide trial environment access
3. Conduct proof-of-concept planning
4. Share detailed technical documentation

### 30-Day Timeline
- Week 1: Environment setup and data assessment
- Week 2: Migration planning and testing
- Week 3: Application integration and optimization
- Week 4: Go-live preparation and validation

### Success Metrics
- Performance benchmarks
- Cost savings calculations
- User adoption rates
- System reliability metrics

## Follow-up Materials
- Technical architecture documents
- Migration best practices guide
- Performance tuning recommendations
- Training and certification paths
- Community resources and support channels
`;
  }

  private generateCustomerTalkingPoints(repository: Repository): string {
    const useCaseType = repository.useCases[0];
    const language = repository.language;
    
    const talkingPoints = {
      "pg_route/Transportation": {
        painPoints: [
          "Manual route planning is time-consuming and inefficient",
          "Fuel costs are rising and need optimization", 
          "Customer delivery expectations are increasing",
          "Existing routing solutions are expensive or limited"
        ],
        solutions: [
          "Automated route optimization reduces planning time by 85%",
          "Optimal routing cuts fuel costs by 15-25%",
          "Real-time routing improves customer satisfaction",
          "Open-source solution eliminates licensing costs"
        ],
        benefits: [
          "$50K+ annual savings in fuel and labor costs",
          "2-3x faster route planning and execution",
          "99.9% uptime with AWS infrastructure",
          "Scales from hundreds to millions of routes"
        ]
      },
      "PostGIS/Geospatial Analysis": {
        painPoints: [
          "Geospatial data scattered across multiple systems",
          "Manual spatial analysis is slow and error-prone",
          "Expensive GIS software licensing costs",
          "Limited integration with business applications"
        ],
        solutions: [
          "Centralized geospatial data management",
          "Automated spatial analysis and reporting",
          "Open-source PostGIS eliminates licensing costs",
          "SQL-based interface integrates with any application"
        ],
        benefits: [
          "80% reduction in spatial analysis time",
          "Unified geospatial data platform",
          "Industry-standard spatial functions",
          "Seamless integration with existing workflows"
        ]
      },
      "Real Estate/Property Search": {
        painPoints: [
          "Property search is slow and frustrating for customers",
          "Limited search criteria and filtering options",
          "Manual market analysis is time-intensive",
          "Competitive disadvantage in fast-moving markets"
        ],
        solutions: [
          "Lightning-fast proximity-based property search",
          "Advanced filtering by amenities, schools, commute times",
          "Automated market analysis and pricing insights",
          "Real-time property recommendations"
        ],
        benefits: [
          "40% faster property discovery process",
          "25% increase in customer conversion rates",
          "Automated valuation with 95%+ accuracy",
          "Competitive advantage through superior search experience"
        ]
      },
      "PostgreSQL Replicator": {
        painPoints: [
          "Database downtime impacts business operations",
          "Data loss risk during system failures",
          "Limited disaster recovery capabilities",
          "Expensive replication licensing costs"
        ],
        solutions: [
          "Automatic failover with sub-second recovery",
          "Zero data loss with synchronous replication",
          "Cross-region disaster recovery",
          "Built-in PostgreSQL replication (no additional licensing)"
        ],
        benefits: [
          "99.99% uptime SLA achievement",
          "Zero data loss guarantee",
          "Geographic disaster protection",
          "Read scaling improves application performance"
        ]
      },
      "Data Migration": {
        painPoints: [
          "High database licensing and maintenance costs",
          "Limited scalability with current database",
          "Vendor lock-in constrains technology choices",
          "Manual processes limit operational efficiency"
        ],
        solutions: [
          "50-80% cost reduction with PostgreSQL migration",
          "Superior performance and unlimited scalability",
          "Open-source eliminates vendor lock-in",
          "Modern features enable automation and efficiency"
        ],
        benefits: [
          "ROI achieved within 6-12 months",
          "20-40% performance improvement",
          "Future-proof technology platform",
          "Enhanced security and compliance capabilities"
        ]
      }
    };

    const points = talkingPoints[useCaseType] || talkingPoints["PostGIS/Geospatial Analysis"];

    return `# Customer Talking Points: ${repository.name}

## Discovery Questions

### Current State Assessment
- What database technology are you currently using?
- What are your biggest pain points with your current solution?
- How much are you spending annually on database licensing and support?
- What performance or scalability challenges are you facing?
- How critical is high availability for your operations?

### Requirements Gathering  
- What are your primary use cases and workloads?
- What are your performance and scalability requirements?
- Do you have specific compliance or security requirements?
- What is your timeline for implementing a new solution?
- What success metrics would you use to evaluate the solution?

## Pain Points to Address

${points.painPoints.map(point => `- ${point}`).join('\n')}

## PostgreSQL Solutions

${points.solutions.map(solution => `- ${solution}`).join('\n')}

## Quantifiable Benefits

${points.benefits.map(benefit => `- ${benefit}`).join('\n')}

## Technical Differentiators

### PostgreSQL Advantages
- **Open Source**: No vendor lock-in, lower total cost of ownership
- **Extensibility**: Rich ecosystem of extensions (PostGIS, pg_route, etc.)
- **ACID Compliance**: Enterprise-grade data integrity and consistency
- **Advanced Features**: JSON support, full-text search, advanced indexing
- **Scalability**: Handles workloads from startup to enterprise scale

### ${language} Integration Benefits
- **Native Connectivity**: Excellent PostgreSQL drivers and ORMs
- **Performance**: Optimized connection pooling and query execution
- **Developer Productivity**: Rich ecosystem of tools and libraries
- **Community Support**: Large, active developer community

## Competitive Positioning

### vs. Oracle
- **Cost**: 80-90% lower total cost of ownership
- **Performance**: Comparable or better for most workloads
- **Features**: More modern architecture and feature set
- **Flexibility**: No restrictive licensing terms

### vs. SQL Server
- **Cost**: No licensing fees, lower operational costs
- **Platform Independence**: Runs on any operating system
- **Scalability**: Better horizontal scaling capabilities
- **Extensions**: Richer ecosystem of specialized extensions

### vs. MySQL
- **Advanced Features**: Superior handling of complex queries
- **Data Integrity**: Better ACID compliance and constraint enforcement
- **Extensibility**: More sophisticated extension architecture
- **Performance**: Better performance for analytical workloads

## ROI Calculation Framework

### Cost Savings
- Database licensing elimination: $X per year
- Reduced hardware requirements: $Y per year  
- Lower support and maintenance: $Z per year
- Improved developer productivity: $A per year

### Performance Benefits
- Faster query execution: X% improvement
- Reduced downtime: Y hours saved per year
- Improved application response times: Z% faster
- Enhanced user experience: A% increase in satisfaction

### Implementation Investment
- Migration services: $X (one-time)
- Training and certification: $Y (one-time)
- Infrastructure setup: $Z (one-time)
- Ongoing support: $A per year

## Success Stories and Case Studies

### Similar Industry Examples
- [Company A]: 60% cost reduction, 3x performance improvement
- [Company B]: Zero downtime achieved, 50% faster development cycles
- [Company C]: Successful migration of 500TB database, 40% cost savings

### Reference Customers
- Available upon request for qualified opportunities
- Industry-specific case studies and testimonials
- Technical reference calls with existing customers

## Next Steps and Timeline

### Phase 1: Assessment (Week 1-2)
- Current environment analysis
- Requirements gathering and validation
- Technical architecture review
- ROI calculation and business case

### Phase 2: Proof of Concept (Week 3-6)
- Environment setup and configuration
- Sample data migration and testing
- Performance benchmarking
- Application integration testing

### Phase 3: Production Migration (Week 7-12)
- Full data migration execution
- Application cutover and validation
- Performance tuning and optimization
- Go-live support and monitoring

### Phase 4: Optimization (Month 4-6)
- Performance monitoring and tuning
- User training and adoption
- Advanced feature implementation
- Ongoing support transition

## Objection Handling

### "We're concerned about support for open-source"
**Response**: PostgreSQL has excellent commercial support options, large community, and is backed by major cloud providers. Many Fortune 500 companies rely on PostgreSQL in production.

### "Migration seems risky and complex"
**Response**: We have proven migration methodologies and tools. Our success rate is 99.9% with minimal downtime. We provide comprehensive testing and rollback procedures.

### "What about performance compared to our current database?"
**Response**: PostgreSQL typically matches or exceeds performance of commercial databases. We'll conduct benchmarking during the POC to validate performance for your specific workloads.

### "How do we justify the migration effort?"
**Response**: ROI is typically achieved within 6-12 months through cost savings alone. Performance improvements and new capabilities provide additional long-term value.
`;
  }

  private generateBastionSetupScript(repository: Repository): string {
    const postgresVersion = this.extractPostgresVersion(repository.databaseVersion);
    const isPropertySearch = repository.useCases.includes("Real Estate/Property Search");
    const isPgRoute = repository.useCases.includes("pg_route/Transportation");
    
    return `#!/bin/bash
set -e

echo "🚀 Setting up ${repository.name} on Ubuntu Bastion Host..."

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL ${postgresVersion}
sudo apt install -y wget ca-certificates
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list
sudo apt update
sudo apt install -y postgresql-${postgresVersion} postgresql-client-${postgresVersion} postgresql-contrib-${postgresVersion}

# Install PostGIS extension
sudo apt install -y postgis postgresql-${postgresVersion}-postgis-3

${isPgRoute ? `# Install pgRouting extension
sudo apt install -y postgresql-${postgresVersion}-pgrouting` : ''}

# Configure PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres createdb ${repository.name}
sudo -u postgres psql -c "CREATE USER appuser WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${repository.name} TO appuser;"

# Enable extensions
sudo -u postgres psql -d ${repository.name} -c "CREATE EXTENSION postgis;"
${isPgRoute ? `sudo -u postgres psql -d ${repository.name} -c "CREATE EXTENSION pgrouting;"` : ''}

${repository.language === "Python" ? `
# Install Python and dependencies
sudo apt install -y python3 python3-pip python3-venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
` : `
# Install Node.js and dependencies
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
npm install
`}

# Run database setup
${repository.language === "Python" ? `
export DATABASE_URL="postgresql://appuser:secure_password@localhost:5432/${repository.name}"
python database/setup.py
` : `
export DATABASE_URL="postgresql://appuser:secure_password@localhost:5432/${repository.name}"
node database/setup.js
`}

${isPropertySearch ? `
# Load sample property data
echo "Loading sample property dataset..."
sudo -u postgres psql -d ${repository.name} -f database/sample_properties.sql
` : ''}

# Configure firewall
sudo ufw allow 22
sudo ufw allow 5432
sudo ufw allow 3000
sudo ufw --force enable

echo "✅ Setup completed successfully!"
echo "🗄️  Database: postgresql://appuser:secure_password@localhost:5432/${repository.name}"
echo "🌐 Application: http://$(curl -s ifconfig.me):3000"
`;
  }

  private generateUbuntuDeploymentGuide(repository: Repository): string {
    return `# Ubuntu Deployment Guide for ${repository.name}

## Prerequisites
- Ubuntu 20.04 or 22.04 LTS
- SSH key pair for EC2 access
- AWS CLI configured with appropriate permissions

## Step 1: Deploy Infrastructure

Deploy the CloudFormation stack to create AWS infrastructure:

\`\`\`bash
aws cloudformation deploy \\
    --template-file cloudformation/main.yaml \\
    --stack-name ${repository.name} \\
    --parameter-overrides file://cloudformation/parameters.json \\
    --capabilities CAPABILITY_IAM \\
    --region us-west-2
\`\`\`

## Step 2: Connect to Bastion Host

Get the bastion host IP address:

\`\`\`bash
BASTION_IP=$(aws cloudformation describe-stacks \\
    --stack-name ${repository.name} \\
    --query 'Stacks[0].Outputs[?OutputKey==\`BastionPublicIP\`].OutputValue' \\
    --output text)

echo "Bastion Host IP: $BASTION_IP"
\`\`\`

Connect via SSH:

\`\`\`bash
ssh -i your-key.pem ubuntu@$BASTION_IP
\`\`\`

## Step 3: Upload and Run Setup

Transfer files to bastion host:

\`\`\`bash
# From your local machine
scp -i your-key.pem -r . ubuntu@$BASTION_IP:~/app/
\`\`\`

Run the setup script on bastion host:

\`\`\`bash
# On bastion host
cd ~/app
chmod +x scripts/bastion-setup.sh
./scripts/bastion-setup.sh
\`\`\`

## Step 4: Start Application

${repository.language === "Python" ? `
\`\`\`bash
# Activate virtual environment
source venv/bin/activate

# Start the application
python app.py
\`\`\`
` : `
\`\`\`bash
# Start the application
npm start
\`\`\`
`}

## Step 5: Access Application

The application will be available at:
- http://BASTION_IP:3000

## Database Connection

- **Host**: localhost (from bastion host)
- **Port**: 5432
- **Database**: ${repository.name}
- **Username**: appuser
- **Password**: secure_password

## Monitoring and Logs

View application logs:
\`\`\`bash
${repository.language === "Python" ? "tail -f app.log" : "npm run logs"}
\`\`\`

View PostgreSQL logs:
\`\`\`bash
sudo tail -f /var/log/postgresql/postgresql-*.log
\`\`\`

## Security Notes

1. Change default passwords in production
2. Configure proper SSL certificates
3. Restrict database access to application only
4. Enable CloudWatch monitoring for production use

## Troubleshooting

### PostgreSQL Connection Issues
\`\`\`bash
sudo systemctl status postgresql
sudo -u postgres psql -l
\`\`\`

### Application Issues
\`\`\`bash
# Check if port is in use
sudo netstat -tlnp | grep 3000

# Restart application
${repository.language === "Python" ? "pkill python && python app.py &" : "npm restart"}
\`\`\`
`;
  }

  private generateCloudFormationMonitoring(repository: Repository): string {
    return `AWSTemplateFormatVersion: '2010-09-09'
Description: 'CloudWatch monitoring and alerting for pg_route and PostGIS'

Parameters:
  ProjectName:
    Type: String
  Environment:
    Type: String
  DatabaseIdentifier:
    Type: String

Resources:
  # CloudWatch Log Groups
  PostgreSQLLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub '/aws/rds/instance/\${DatabaseIdentifier}/postgresql'
      RetentionInDays: 7
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-postgresql-logs'
        - Key: Environment
          Value: !Ref Environment

  UpgradeLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub '/aws/rds/instance/\${DatabaseIdentifier}/upgrade'
      RetentionInDays: 7
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-upgrade-logs'
        - Key: Environment
          Value: !Ref Environment

  # SNS Topic for Alerts
  AlertsTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: !Sub '\${ProjectName}-alerts'
      DisplayName: !Sub '\${ProjectName} Alerts'
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-alerts-topic'
        - Key: Environment
          Value: !Ref Environment

  # CloudWatch Alarms
  DatabaseCPUAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '\${ProjectName}-database-cpu-utilization'
      AlarmDescription: Database CPU utilization
      MetricName: CPUUtilization
      Namespace: AWS/RDS
      Statistic: Average
      Period: 120
      EvaluationPeriods: 2
      Threshold: 80
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: DBInstanceIdentifier
          Value: !Ref DatabaseIdentifier
      AlarmActions:
        - !Ref AlertsTopic
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-database-cpu-alarm'
        - Key: Environment
          Value: !Ref Environment

  DatabaseConnectionsAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '\${ProjectName}-database-connections'
      AlarmDescription: Database connections
      MetricName: DatabaseConnections
      Namespace: AWS/RDS
      Statistic: Average
      Period: 120
      EvaluationPeriods: 2
      Threshold: 20
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: DBInstanceIdentifier
          Value: !Ref DatabaseIdentifier
      AlarmActions:
        - !Ref AlertsTopic
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-database-connections-alarm'
        - Key: Environment
          Value: !Ref Environment

Outputs:
  AlertsTopicArn:
    Description: ARN of the SNS alerts topic
    Value: !Ref AlertsTopic

  PostgreSQLLogGroupName:
    Description: Name of the PostgreSQL log group
    Value: !Ref PostgreSQLLogGroup

  UpgradeLogGroupName:
    Description: Name of the upgrade log group
    Value: !Ref UpgradeLogGroup`;
  }
}

export const storage = new MemStorage();
