import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ConfigurationPanel from "@/components/configuration-panel";
import ProgressTracker from "@/components/progress-tracker";
import RepositoryStructure from "@/components/repository-structure";
import LearningModules from "@/components/learning-modules";
import CodePreview from "@/components/code-preview";
import DatasetsPreview from "@/components/datasets-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Database, 
  MapPin, 
  TrendingUp, 
  GitBranch, 
  FileText, 
  Brain, 
  Users, 
  Search,
  Clock,
  Star,
  ChevronRight
} from "lucide-react";
import type { Repository } from "@shared/schema";

// Enhanced use case data structure for scalable organization
const useCaseCategories = {
  "production-ready": {
    title: "Production Ready",
    description: "Battle-tested solutions ready for enterprise deployment",
    color: "green",
    cases: [
      {
        id: "real-estate-search",
        name: "Real Estate/Property Search",
        icon: MapPin,
        description: "PostGIS spatial data types, GIST indexing, proximity queries for property location services.",
        difficulty: "Intermediate",
        duration: "45-60 min",
        popularity: 95,
        technologies: ["PostGIS", "GIST Indexes", "AWS RDS"],
        keyFeatures: ["Spatial Indexing", "Radius Queries", "Market Analysis"]
      },
      {
        id: "time-series-analytics",
        name: "Time-Series Analytics", 
        icon: TrendingUp,
        description: "Native PostgreSQL partitioning, BRIN indexes, time-bucket aggregations for IoT and monitoring.",
        difficulty: "Intermediate",
        duration: "60-90 min",
        popularity: 88,
        technologies: ["BRIN Indexes", "Partitioning", "AWS Aurora"],
        keyFeatures: ["Time Partitioning", "BRIN Indexes", "Anomaly Detection"]
      },
      {
        id: "data-migration",
        name: "Data Migration & Upgrades",
        icon: GitBranch,
        description: "CloudFormation infrastructure, AWS DMS setup, blue-green deployment patterns.",
        difficulty: "Advanced",
        duration: "90-120 min",
        popularity: 82,
        technologies: ["AWS DMS", "CloudFormation", "Blue-Green"],
        keyFeatures: ["Zero Downtime", "Rollback Strategy", "AWS DMS"]
      },
      {
        id: "transportation-routing",
        name: "Transportation & Routing",
        icon: MapPin,
        description: "pgRouting extension, network topology, shortest path algorithms for logistics.",
        difficulty: "Intermediate", 
        duration: "60-75 min",
        popularity: 76,
        technologies: ["pgRouting", "Graph Theory", "OSRM"],
        keyFeatures: ["Route Optimization", "Graph Algorithms", "Cost Analysis"]
      }
    ]
  },
  "high-availability": {
    title: "High Availability & Scaling",
    description: "Enterprise-grade reliability and performance solutions",
    color: "blue",
    cases: [
      {
        id: "postgresql-replication",
        name: "PostgreSQL Replication",
        icon: Database,
        description: "Aurora read replicas, cross-region replication, automated failover configuration.",
        difficulty: "Advanced",
        duration: "75-90 min",
        popularity: 91,
        technologies: ["Aurora", "Read Replicas", "Multi-AZ"],
        keyFeatures: ["Auto Failover", "Cross-Region", "Load Balancing"]
      }
    ]
  },
  "coming-soon": {
    title: "Coming Soon",
    description: "Advanced features in development for future releases",
    color: "gray",
    cases: [
      {
        id: "json-document-storage",
        name: "JSON & Document Storage",
        icon: FileText,
        description: "JSONB data types, GIN indexing, JSON path queries for semi-structured data.",
        difficulty: "Intermediate",
        duration: "45-60 min",
        popularity: 0,
        technologies: ["JSONB", "GIN Indexes", "JSON Operators"],
        keyFeatures: ["Schema Flexibility", "JSON Paths", "NoSQL Patterns"]
      },
      {
        id: "machine-learning",
        name: "Machine Learning & AI",
        icon: Brain,
        description: "PostgreSQL ML extensions, vector data types, AI model integration.",
        difficulty: "Advanced",
        duration: "90-120 min", 
        popularity: 0,
        technologies: ["pgvector", "MADlib", "Vector DB"],
        keyFeatures: ["Vector Search", "ML Models", "AI Integration"]
      },
      {
        id: "multi-tenant-saas",
        name: "Multi-Tenant SaaS",
        icon: Users,
        description: "Row-level security, tenant isolation, shared schema patterns for SaaS applications.",
        difficulty: "Advanced",
        duration: "120+ min",
        popularity: 0,
        technologies: ["RLS", "Policies", "Multi-tenancy"],
        keyFeatures: ["Tenant Isolation", "Data Privacy", "Shared Schema"]
      }
    ]
  }
};

export default function Home() {
  const [currentRepository, setCurrentRepository] = useState<Repository | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("production-ready");

  const { data: repositories = [] } = useQuery({
    queryKey: ["/api/repositories"],
    refetchInterval: 1000, // Poll every second for real-time updates
  });

  // Update current repository when repositories data changes
  useEffect(() => {
    if (repositories.length > 0 && currentRepository) {
      const updatedRepo = (repositories as Repository[]).find((repo: Repository) => repo.id === currentRepository.id);
      if (updatedRepo && (updatedRepo.status !== currentRepository.status || updatedRepo.progress !== currentRepository.progress)) {
        setCurrentRepository(updatedRepo);
      }
    }
  }, [repositories, currentRepository]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "beginner": return "text-green-600 bg-green-50 border-green-200";
      case "intermediate": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "advanced": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getPopularityStars = (popularity: number) => {
    const stars = Math.round(popularity / 20);
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-3 h-3 ${i < stars ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
      />
    ));
  };

  const allProductionCases = useCaseCategories["production-ready"].cases.concat(
    useCaseCategories["high-availability"].cases
  );

  const filteredCases = (cases: any[]) => {
    return cases.filter(useCase => 
      useCase.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      useCase.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      useCase.technologies.some((tech: string) => tech.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-primary rounded-lg p-2">
                <i className="fas fa-map-marked-alt text-white text-xl"></i>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">PostgreSQL Demo Generator</h1>
                <p className="text-sm text-gray-600">Generate complete demo repositories for customer presentations</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-1">
                <i className="fas fa-code-branch text-primary text-sm"></i>
                <span className="text-sm font-medium">v2.1.0</span>
              </div>

              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setCurrentRepository(null);
                  }}
                  disabled={!currentRepository}
                >
                  <i className="fas fa-refresh mr-2"></i>
                  New Repository
                </Button>
                <Button 
                  className="bg-primary text-white hover:bg-blue-700"
                  disabled={!currentRepository || currentRepository.status !== "complete"}
                  onClick={() => {
                    if (currentRepository?.status === "complete") {
                      window.open(`/api/repositories/${currentRepository.id}/download`, '_blank');
                      // Auto-refresh after download
                      setTimeout(() => {
                        setCurrentRepository(null);
                      }, 2000);
                    }
                  }}
                >
                  <i className="fas fa-download mr-2"></i>
                  Download ZIP
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentRepository ? (
          <div className="space-y-8">
            {/* Hero Section with Search */}
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                PostgreSQL Demo Generator
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Generate complete, production-ready PostgreSQL demonstrations with AWS infrastructure
              </p>
              
              {/* Search Bar */}
              <div className="max-w-md mx-auto relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search use cases, technologies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 py-3 text-lg"
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-green-600 mb-2">5</div>
                  <div className="text-sm text-gray-600">Production Ready</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-blue-600 mb-2">3</div>
                  <div className="text-sm text-gray-600">Coming Soon</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-purple-600 mb-2">15+</div>
                  <div className="text-sm text-gray-600">AWS Services</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-orange-600 mb-2">2</div>
                  <div className="text-sm text-gray-600">Languages</div>
                </CardContent>
              </Card>
            </div>

            {/* Featured Use Cases */}
            <div className="bg-white rounded-lg shadow-sm p-8 mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Popular Use Cases</h3>
              <p className="text-gray-600 mb-8">Most requested PostgreSQL demonstration scenarios</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {allProductionCases
                  .sort((a, b) => b.popularity - a.popularity)
                  .slice(0, 4)
                  .map(useCase => {
                    const IconComponent = useCase.icon;
                    return (
                      <Card key={useCase.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="p-2 rounded-lg bg-blue-100">
                              <IconComponent className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm group-hover:text-blue-600 transition-colors">{useCase.name}</h4>
                              <div className="flex space-x-1 mt-1">
                                {getPopularityStars(useCase.popularity)}
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">{useCase.description}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>

            {/* Tabbed Categories */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-12">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="production-ready">Production Ready</TabsTrigger>
                <TabsTrigger value="high-availability">High Availability</TabsTrigger>
                <TabsTrigger value="coming-soon">Coming Soon</TabsTrigger>
              </TabsList>

              {Object.entries(useCaseCategories).map(([key, category]) => (
                <TabsContent key={key} value={key} className="mt-6">
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{category.title}</h3>
                    <p className="text-gray-600">{category.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCases(category.cases).map(useCase => {
                      const IconComponent = useCase.icon;
                      const isAvailable = key !== "coming-soon";
                      
                      return (
                        <Card key={useCase.id} className={`hover:shadow-lg transition-all duration-200 ${!isAvailable ? 'opacity-75' : ''}`}>
                          <CardHeader>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className={`p-3 rounded-lg bg-${category.color}-100`}>
                                  <IconComponent className={`w-6 h-6 text-${category.color}-600`} />
                                </div>
                                <div>
                                  <CardTitle className="text-lg">{useCase.name}</CardTitle>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Badge className={getDifficultyColor(useCase.difficulty)} variant="secondary">
                                      {useCase.difficulty}
                                    </Badge>
                                    <div className="flex items-center space-x-1">
                                      <Clock className="w-3 h-3 text-gray-400" />
                                      <span className="text-xs text-gray-500">{useCase.duration}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {isAvailable && (
                                <div className="flex space-x-1">
                                  {getPopularityStars(useCase.popularity)}
                                </div>
                              )}
                            </div>
                            
                            <CardDescription className="text-sm leading-relaxed">
                              {useCase.description}
                            </CardDescription>
                          </CardHeader>
                          
                          <CardContent>
                            <div className="space-y-4">
                              {/* Key Features */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Key Features</h4>
                                <div className="flex flex-wrap gap-1">
                                  {useCase.keyFeatures.map((feature: string) => (
                                    <Badge key={feature} variant="outline" className="text-xs">
                                      {feature}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              {/* Technologies */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Technologies</h4>
                                <div className="flex flex-wrap gap-1">
                                  {useCase.technologies.map((tech: string) => (
                                    <Badge key={tech} variant="secondary" className="text-xs">
                                      {tech}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              {/* Action Button */}
                              <Button 
                                className="w-full group" 
                                disabled={!isAvailable}
                                variant={isAvailable ? "default" : "secondary"}
                                onClick={() => {
                                  // This would integrate with your existing ConfigurationPanel
                                  // For now, keeping the existing configuration flow
                                }}
                              >
                                {isAvailable ? (
                                  <>
                                    Generate Repository
                                    <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                  </>
                                ) : (
                                  "Coming Soon"
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {/* Configuration Panel */}
            <ConfigurationPanel 
              onRepositoryCreate={setCurrentRepository}
              currentRepository={currentRepository}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Progress Sidebar */}
            <div className="lg:col-span-1">
              <ProgressTracker repository={currentRepository} />
            </div>
            
            {/* Main Content Area */}
            <div className="lg:col-span-3">
            {/* Application Overview */}
            <Card className="mb-8 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold text-purple-900 mb-4 flex items-center">
                  <i className="fas fa-presentation-screen mr-3"></i>
                  PostgreSQL Demo Generator
                </h2>
                <div className="text-purple-800 space-y-3">
                  <p className="text-lg">
                    Generate complete, professional demo repositories for customer presentations showcasing PostgreSQL capabilities.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-white/60 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2 flex items-center">
                        <i className="fas fa-box mr-2"></i>What You Get
                      </h3>
                      <ul className="space-y-1 text-sm">
                        <li>• Complete ZIP package with all files</li>
                        <li>• CloudFormation infrastructure templates</li>
                        <li>• Demo scripts and presentation guides</li>
                        <li>• Sample datasets and code examples</li>
                      </ul>
                    </div>
                    <div className="bg-white/60 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2 flex items-center">
                        <i className="fas fa-users mr-2"></i>Perfect For
                      </h3>
                      <ul className="space-y-1 text-sm">
                        <li>• Sales engineers and technical demos</li>
                        <li>• Customer proof-of-concepts</li>
                        <li>• Training and workshop materials</li>
                        <li>• Technical team knowledge sharing</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GitHub Setup Instructions */}
            <Card className="mb-8 bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                  <i className="fab fa-github mr-2"></i>
                  Setting up your GitHub Repository
                </h3>
                <div className="space-y-4 text-sm text-blue-800">
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg mb-4">
                    <h4 className="font-medium text-green-900 mb-2 flex items-center">
                      <i className="fas fa-download mr-2"></i>
                      Prerequisites: Install Git CLI
                    </h4>
                    <div className="text-green-800 space-y-2">
                      <p>If you don't have Git installed:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>Windows:</strong> Download from <a href="https://git-scm.com/download/win" className="underline" target="_blank">git-scm.com</a></li>
                        <li><strong>macOS:</strong> Run <code className="bg-green-100 px-1 rounded">brew install git</code> or download from <a href="https://git-scm.com/download/mac" className="underline" target="_blank">git-scm.com</a></li>
                        <li><strong>Linux:</strong> Run <code className="bg-green-100 px-1 rounded">sudo apt install git</code> (Ubuntu/Debian) or <code className="bg-green-100 px-1 rounded">sudo yum install git</code> (RHEL/CentOS)</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">After downloading your ZIP file:</h4>
                    <ol className="list-decimal list-inside space-y-2 ml-4">
                      <li>Extract the ZIP file to your desired location</li>
                      <li>Create a new repository on GitHub with the generated name</li>
                      <li>Initialize and push your code:</li>
                    </ol>
                  </div>
                  
                  <div className="bg-blue-100 p-4 rounded-lg font-mono text-xs">
                    <div className="space-y-1">
                      <div># Navigate to extracted folder</div>
                      <div>cd your-repository-name</div>
                      <div></div>
                      <div># Initialize git repository</div>
                      <div>git init</div>
                      <div>git add .</div>
                      <div>git commit -m "Initial commit: PostgreSQL demo repository"</div>
                      <div></div>
                      <div># Connect to GitHub (replace with your repo URL)</div>
                      <div>git remote add origin https://github.com/yourusername/your-repository-name.git</div>
                      <div>git branch -M main</div>
                      <div>git push -u origin main</div>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                    <p className="text-amber-800 text-sm">
                      <i className="fas fa-lightbulb mr-2"></i>
                      <strong>Pro tip:</strong> Each repository includes CloudFormation templates for AWS deployment, 
                      comprehensive documentation, and sample datasets ready for immediate use.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {currentRepository && (
              <>
                {/* Progress Tracker */}
                <ProgressTracker repository={currentRepository} />
                
                {/* Tabbed Interface */}
                <Card className="mt-8">
                  <Tabs defaultValue="structure" className="w-full">
                    <div className="border-b border-gray-200">
                      <TabsList className="w-full h-auto p-0 bg-transparent">
                        <TabsTrigger 
                          value="structure" 
                          className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none py-4 px-6"
                        >
                          <i className="fas fa-folder-tree mr-2"></i>
                          Repository Structure
                        </TabsTrigger>
                        <TabsTrigger 
                          value="modules"
                          className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none py-4 px-6"
                        >
                          <i className="fas fa-book mr-2"></i>
                          Learning Modules
                        </TabsTrigger>
                        <TabsTrigger 
                          value="code"
                          className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none py-4 px-6"
                        >
                          <i className="fas fa-code mr-2"></i>
                          Code Preview
                        </TabsTrigger>
                        <TabsTrigger 
                          value="datasets"
                          className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none py-4 px-6"
                        >
                          <i className="fas fa-database mr-2"></i>
                          Sample Data
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    
                    <CardContent className="p-6">
                      <TabsContent value="structure" className="mt-0">
                        <RepositoryStructure repository={currentRepository} />
                      </TabsContent>
                      
                      <TabsContent value="modules" className="mt-0">
                        <LearningModules repositoryId={currentRepository.id} />
                      </TabsContent>
                      
                      <TabsContent value="code" className="mt-0">
                        <CodePreview repository={currentRepository} />
                      </TabsContent>
                      
                      <TabsContent value="datasets" className="mt-0">
                        <DatasetsPreview repositoryId={currentRepository.id} />
                      </TabsContent>
                    </CardContent>
                  </Tabs>
                </Card>
              </>
            )}

            {!currentRepository && (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="mb-4">
                    <i className="fas fa-rocket text-primary text-6xl mb-4"></i>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Create Your First Repository
                  </h3>
                  <p className="text-gray-600">
                    Configure your preferences in the sidebar and generate a comprehensive 
                    pg_route and PostGIS learning repository.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Footer Actions */}
            {currentRepository && (
              <Card className="mt-12">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <i className="fas fa-info-circle text-primary mr-2"></i>
                        <span>Repository will be packaged as a ZIP file with all dependencies</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Button variant="outline">
                        <i className="fas fa-eye mr-2"></i>
                        Preview README
                      </Button>
                      <Button 
                        className="bg-primary text-white hover:bg-blue-700"
                        disabled={currentRepository.status !== "complete"}
                      >
                        <i className="fas fa-download mr-2"></i>
                        Download Repository (45MB)
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
