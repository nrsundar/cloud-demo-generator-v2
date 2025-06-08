import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Database, 
  MapPin, 
  TrendingUp, 
  GitBranch, 
  FileText, 
  Brain, 
  Users, 
  Shield,
  Search,
  Clock,
  Star,
  ChevronRight
} from "lucide-react";

// Enhanced use case data structure
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

export default function ScalableHome() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("production-ready");

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "beginner": return "text-green-600 bg-green-50";
      case "intermediate": return "text-yellow-600 bg-yellow-50";
      case "advanced": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
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

  const filteredCases = (cases: any[]) => {
    return cases.filter(useCase => 
      useCase.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      useCase.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      useCase.technologies.some((tech: string) => tech.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const allProductionCases = useCaseCategories["production-ready"].cases.concat(
    useCaseCategories["high-availability"].cases
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            PostgreSQL Demo Generator
          </h1>
          <p className="text-xl text-gray-600 mb-8">
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

        {/* Main Content - Three Layout Options */}
        
        {/* Option 1: Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-12">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="production-ready">Production Ready</TabsTrigger>
            <TabsTrigger value="high-availability">High Availability</TabsTrigger>
            <TabsTrigger value="coming-soon">Coming Soon</TabsTrigger>
          </TabsList>

          {Object.entries(useCaseCategories).map(([key, category]) => (
            <TabsContent key={key} value={key} className="mt-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{category.title}</h2>
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

        {/* Option 2: Category-based Sections (Alternative Layout) */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Popular Use Cases</h2>
          <p className="text-gray-600 mb-8">Most requested PostgreSQL demonstration scenarios</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {allProductionCases
              .sort((a, b) => b.popularity - a.popularity)
              .slice(0, 4)
              .map(useCase => {
                const IconComponent = useCase.icon;
                return (
                  <Card key={useCase.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <IconComponent className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">{useCase.name}</h3>
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

        {/* Option 3: Compact List View */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">All Use Cases</h2>
          <p className="text-gray-600 mb-6">Complete overview of available demonstrations</p>
          
          <div className="space-y-4">
            {Object.entries(useCaseCategories).map(([key, category]) => (
              <div key={key}>
                <h3 className={`text-lg font-semibold text-${category.color}-700 mb-3`}>
                  {category.title}
                </h3>
                <div className="grid gap-3">
                  {filteredCases(category.cases).map(useCase => {
                    const IconComponent = useCase.icon;
                    const isAvailable = key !== "coming-soon";
                    
                    return (
                      <div key={useCase.id} className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 ${!isAvailable ? 'opacity-60' : ''}`}>
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-lg bg-${category.color}-100`}>
                            <IconComponent className={`w-5 h-5 text-${category.color}-600`} />
                          </div>
                          <div>
                            <h4 className="font-medium">{useCase.name}</h4>
                            <p className="text-sm text-gray-600">{useCase.description}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <Badge className={getDifficultyColor(useCase.difficulty)} variant="secondary">
                                {useCase.difficulty}
                              </Badge>
                              <span className="text-xs text-gray-500">{useCase.duration}</span>
                              {isAvailable && (
                                <div className="flex space-x-1">
                                  {getPopularityStars(useCase.popularity)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button 
                          disabled={!isAvailable}
                          variant={isAvailable ? "default" : "secondary"}
                          size="sm"
                        >
                          {isAvailable ? "Generate" : "Soon"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}