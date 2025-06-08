import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Database, MapPin, TrendingUp, GitBranch, FileText, Brain, Cloud, Users } from "lucide-react";

// Enhanced use case data structure for scalability
const useCaseData = [
  {
    id: "real-estate-search",
    name: "Real Estate/Property Search",
    category: "Geospatial",
    status: "production",
    difficulty: "intermediate",
    duration: "45-60 min",
    icon: MapPin,
    color: "blue",
    description: "PostGIS spatial data types, GIST indexing, proximity queries for property location services.",
    features: ["Spatial Indexing", "Radius Queries", "Polygon Containment", "Market Analysis"],
    technologies: ["PostGIS", "GIST Indexes", "AWS RDS"],
    tags: ["spatial", "real-estate", "geolocation"]
  },
  {
    id: "time-series-analytics",
    name: "Time-Series Analytics",
    category: "Analytics",
    status: "production",
    difficulty: "intermediate",
    duration: "60-90 min",
    icon: TrendingUp,
    color: "orange",
    description: "Native PostgreSQL partitioning, BRIN indexes, time-bucket aggregations for IoT and monitoring.",
    features: ["Table Partitioning", "BRIN Indexes", "Time Aggregations", "Anomaly Detection"],
    technologies: ["PostgreSQL Partitioning", "BRIN", "AWS Aurora"],
    tags: ["time-series", "iot", "monitoring", "analytics"]
  },
  {
    id: "data-migration",
    name: "Data Migration & Upgrades",
    category: "Infrastructure",
    status: "production",
    difficulty: "advanced",
    duration: "90-120 min",
    icon: GitBranch,
    color: "green",
    description: "CloudFormation infrastructure, AWS DMS setup, blue-green deployment patterns.",
    features: ["Blue-Green Deployment", "Zero Downtime", "AWS DMS", "Rollback Strategy"],
    technologies: ["AWS DMS", "CloudFormation", "Blue-Green"],
    tags: ["migration", "infrastructure", "devops"]
  },
  {
    id: "postgresql-replication",
    name: "PostgreSQL Replication",
    category: "High Availability",
    status: "production",
    difficulty: "advanced",
    duration: "75-90 min",
    icon: Database,
    color: "purple",
    description: "Aurora read replicas, cross-region replication, automated failover configuration.",
    features: ["Read Replicas", "Cross-Region", "Auto Failover", "Load Balancing"],
    technologies: ["Aurora", "Read Replicas", "Multi-AZ"],
    tags: ["replication", "ha", "disaster-recovery"]
  },
  {
    id: "transportation-routing",
    name: "Transportation & Routing",
    category: "Geospatial",
    status: "production",
    difficulty: "intermediate",
    duration: "60-75 min",
    icon: MapPin,
    color: "indigo",
    description: "pgRouting extension, network topology, shortest path algorithms for logistics.",
    features: ["Graph Algorithms", "Route Optimization", "Network Topology", "Cost Analysis"],
    technologies: ["pgRouting", "Graph Theory", "OSRM"],
    tags: ["routing", "logistics", "optimization"]
  },
  // Future use cases
  {
    id: "json-document-storage",
    name: "JSON & Document Storage",
    category: "NoSQL Patterns",
    status: "coming-soon",
    difficulty: "intermediate",
    duration: "45-60 min",
    icon: FileText,
    color: "gray",
    description: "JSONB data types, GIN indexing, JSON path queries for semi-structured data.",
    features: ["JSONB", "GIN Indexes", "JSON Paths", "Schema Flexibility"],
    technologies: ["JSONB", "GIN", "JSON Operators"],
    tags: ["json", "document", "nosql"]
  },
  {
    id: "machine-learning",
    name: "Machine Learning & AI",
    category: "AI/ML",
    status: "coming-soon",
    difficulty: "advanced",
    duration: "90-120 min",
    icon: Brain,
    color: "gray",
    description: "PostgreSQL ML extensions, vector data types, AI model integration.",
    features: ["Vector Search", "ML Models", "Embeddings", "AI Integration"],
    technologies: ["pgvector", "MADlib", "Vector DB"],
    tags: ["ml", "ai", "vector", "embeddings"]
  },
  {
    id: "multi-tenant-saas",
    name: "Multi-Tenant SaaS",
    category: "Architecture",
    status: "coming-soon",
    difficulty: "advanced",
    duration: "120+ min",
    icon: Users,
    color: "gray",
    description: "Row-level security, tenant isolation, shared schema patterns for SaaS applications.",
    features: ["RLS", "Tenant Isolation", "Shared Schema", "Data Privacy"],
    technologies: ["RLS", "Policies", "Multi-tenancy"],
    tags: ["saas", "multi-tenant", "security", "rls"]
  }
];

const categories = Array.from(new Set(useCaseData.map(uc => uc.category)));
const statuses = Array.from(new Set(useCaseData.map(uc => uc.status)));
const difficulties = Array.from(new Set(useCaseData.map(uc => uc.difficulty)));

export default function UseCasesGallery() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");

  const filteredUseCases = useCaseData.filter(useCase => {
    const matchesSearch = useCase.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         useCase.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         useCase.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || useCase.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || useCase.status === selectedStatus;
    const matchesDifficulty = selectedDifficulty === "all" || useCase.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesDifficulty;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "production":
        return <Badge className="bg-green-600">Production Ready</Badge>;
      case "coming-soon":
        return <Badge variant="secondary">Coming Soon</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "text-green-600";
      case "intermediate": return "text-yellow-600";
      case "advanced": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">PostgreSQL Use Cases Gallery</h1>
          <p className="text-xl text-gray-600">
            Explore comprehensive PostgreSQL demonstrations for various real-world scenarios
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search use cases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status === "production" ? "Production Ready" : 
                     status === "coming-soon" ? "Coming Soon" : status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {difficulties.map(difficulty => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredUseCases.length} of {useCaseData.length} use cases
          </p>
        </div>

        {/* Use Cases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUseCases.map(useCase => {
            const IconComponent = useCase.icon;
            return (
              <Card key={useCase.id} className={`border-${useCase.color}-200 hover:shadow-lg transition-shadow duration-200`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-${useCase.color}-100`}>
                        <IconComponent className={`w-6 h-6 text-${useCase.color}-600`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{useCase.name}</CardTitle>
                        <p className="text-sm text-gray-500">{useCase.category}</p>
                      </div>
                    </div>
                    {getStatusBadge(useCase.status)}
                  </div>
                  
                  <CardDescription className="text-sm">
                    {useCase.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {/* Metadata */}
                    <div className="flex justify-between text-sm">
                      <span className={`font-medium ${getDifficultyColor(useCase.difficulty)}`}>
                        {useCase.difficulty.charAt(0).toUpperCase() + useCase.difficulty.slice(1)}
                      </span>
                      <span className="text-gray-500">{useCase.duration}</span>
                    </div>

                    {/* Features */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Key Features</h4>
                      <div className="flex flex-wrap gap-1">
                        {useCase.features.slice(0, 3).map(feature => (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                        {useCase.features.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{useCase.features.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Technologies */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Technologies</h4>
                      <div className="flex flex-wrap gap-1">
                        {useCase.technologies.map(tech => (
                          <Badge key={tech} variant="secondary" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button 
                      className="w-full" 
                      disabled={useCase.status !== "production"}
                      variant={useCase.status === "production" ? "default" : "secondary"}
                    >
                      {useCase.status === "production" ? "Generate Repository" : "Coming Soon"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* No Results */}
        {filteredUseCases.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <Filter className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No use cases found</h3>
              <p>Try adjusting your filters to see more results</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}