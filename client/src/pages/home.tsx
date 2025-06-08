import React, { useState, 
  const handleDownloadZip = async (repoId: number) => {
    try {
      const response = await fetch(`/api/repositories/${repoId}/zip`);
      if (!response.ok) throw new Error("Failed to download ZIP");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `repository-${repoId}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("ZIP download error:", error);
      alert("Could not download the ZIP file.");
    }
  };


useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ConfigurationPanel from "@/components/configuration-panel";
import ProgressTracker from "@/components/progress-tracker";
import RepositoryStructure from "@/components/repository-structure";
import LearningModules from "@/components/learning-modules";
import CodePreview from "@/components/code-preview";
import DatasetsPreview from "@/components/datasets-preview";
import ToolsDropdown from "@/components/tools-dropdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Database, 
  Cloud,
  MapPin, 
  TrendingUp, 
  GitBranch, 
  FileText, 
  Brain, 
  Users, 
  Search,
  Clock,
  Star,
  ChevronRight,
  BarChart3,
  User,
  LogOut,
  Settings,
  Zap,
  Code,
  ChevronDown,
  MessageSquare
} from "lucide-react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { createSafeUserProfile } from "@/lib/userUtils";
import type { Repository } from "@shared/schema";

// Enhanced use case data structure for scalable organization
const useCaseCategories = {
  "available-use-cases": {
    title: "Available Use Cases",
    description: "Complete implementations ready for demonstrations and customer presentations",
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
        id: "pgvector-image-similarity",
        name: "pgVector Image Similarity Search",
        icon: Brain,
        description: "Visual search for retail catalogs using image embeddings. Find similar products, artwork, or medical images with vector-based similarity matching.",
        difficulty: "Advanced",
        duration: "75-90 min",
        popularity: 0,
        technologies: ["pgvector", "Image Embeddings", "Visual Search"],
        keyFeatures: ["Visual Similarity", "Multi-modal Search", "Image Catalogs"]
      },
      {
        id: "pgvector-recommendation-engine",
        name: "pgVector Recommendation Engine",
        icon: Users,
        description: "Personalized recommendations for streaming, e-commerce, and content platforms. Real-time user preference matching with collaborative filtering.",
        difficulty: "Advanced",
        duration: "85-100 min",
        popularity: 0,
        technologies: ["pgvector", "Collaborative Filtering", "User Embeddings"],
        keyFeatures: ["Personalization", "Real-time Recs", "User Behavior"]
      },
      {
        id: "pgvector-document-rag",
        name: "pgVector Document RAG System",
        icon: FileText,
        description: "Retrieval-Augmented Generation for enterprise knowledge bases. Semantic document search with vector embeddings for AI-powered Q&A systems.",
        difficulty: "Advanced",
        duration: "90-120 min",
        popularity: 0,
        technologies: ["pgvector", "RAG", "Document Embeddings"],
        keyFeatures: ["Semantic Search", "Knowledge Retrieval", "AI Integration"]
      },
      {
        id: "agentic-ai-customer-service",
        name: "Agentic AI Customer Service",
        icon: Users,
        description: "Autonomous AI agents for customer support using PostgreSQL as memory store. Multi-step reasoning, conversation history, and escalation workflows with vector-based context retrieval.",
        difficulty: "Advanced",
        duration: "120-150 min",
        popularity: 0,
        technologies: ["pgvector", "AI Agents", "Conversation Memory"],
        keyFeatures: ["Multi-step Reasoning", "Context Memory", "Autonomous Actions"]
      },
      {
        id: "pgvector-vs-vectordb-benchmark",
        name: "pgVector vs Vector DB Benchmark",
        icon: TrendingUp,
        description: "Performance and cost comparison between pgVector and standalone vector databases. Side-by-side RAG implementation with identical datasets measuring query speed, accuracy, and infrastructure costs.",
        difficulty: "Advanced",
        duration: "150-180 min",
        popularity: 0,
        technologies: ["pgvector", "Performance Testing", "Cost Analysis"],
        keyFeatures: ["Head-to-Head Comparison", "Real-world Datasets", "TCO Analysis"]
      }
    ]
  }
};

export default function Home() {
  const [currentRepository, setCurrentRepository] = useState<Repository | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("available-use-cases");
  const { user, logout } = useFirebaseAuth();
  const { toast } = useToast();
  const safeUser = createSafeUserProfile(user);
  const [, navigate] = useLocation();
  const isAdmin = safeUser?.email === 'sroctank4@gmail.com';

  const { data: repositories = [] } = useQuery({
    queryKey: ["/api/repositories"],
    enabled: !!currentRepository, // Enable when we have an active repository
    refetchInterval: currentRepository && (currentRepository.status === "generating" || currentRepository.status === "queued") ? 1000 : false,
  });

  useEffect(() => {
    if (Array.isArray(repositories) && repositories.length > 0 && currentRepository) {
      const updatedRepo = repositories.find((repo: Repository) => repo.id === currentRepository.id);
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

  const allProductionCases = useCaseCategories["available-use-cases"].cases.concat(
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
      {/* Header with Authentication */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <div className="bg-blue-600 rounded-lg p-2">
                <Cloud className="text-white h-6 w-6" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-gray-900">Cloud Database Generator</h1>
                <p className="text-xs text-gray-600">AWS relational database demonstrations for SEs</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-lg font-semibold text-gray-900">Database Generator</h1>
              </div>
            </div>

            {/* Center - Version Badge */}
            <div className="hidden lg:flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-1">
              <GitBranch className="text-blue-600 h-4 w-4" />
              <span className="text-sm font-medium">v2.1.0</span>
            </div>

            {/* Right Side - User Actions */}
            <div className="flex items-center space-x-2">
              {safeUser ? (
                <>
                  {/* User Info */}
                  <div className="hidden md:flex items-center space-x-2">
                    {safeUser.photoURL && (
                      <img 
                        src={safeUser.photoURL} 
                        alt={safeUser.displayName} 
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                    <div className="min-w-0 max-w-32">
                      <p className="text-sm font-medium text-gray-900 truncate">{safeUser.displayName}</p>
                      <p className="text-xs text-gray-500 truncate">{safeUser.email}</p>
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center space-x-1">
                    <ToolsDropdown />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/demo-request')}
                      className="flex items-center space-x-1"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span className="hidden xl:inline">Custom Demo</span>
                    </Button>
                    {isAdmin && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/admin')}
                        className="flex items-center space-x-1"
                      >
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden xl:inline">Admin</span>
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={logout}
                      className="flex items-center space-x-1"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="hidden xl:inline">Sign Out</span>
                    </Button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-1 border-l border-gray-200 pl-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentRepository(null)}
                      disabled={!currentRepository}
                    >
                      <span className="hidden sm:inline mr-1">New</span>
                      Repository
                    </Button>
                    <Button 
                      size="sm"
                      className={currentRepository?.status === "complete" 
                        ? "bg-green-600 text-white hover:bg-green-700" 
                        : currentRepository?.status === "generating" 
                        ? "bg-yellow-600 text-white hover:bg-yellow-700" 
                        : "bg-blue-600 text-white hover:bg-blue-700"
                      }
                      disabled={!currentRepository || (currentRepository.status !== "complete" && currentRepository.status !== "generating")}
                      onClick={async () => {
                        // Use the most up-to-date repository data
                        const activeRepo = repositories.find((repo: Repository) => repo.id === currentRepository?.id) || currentRepository;
                        if (activeRepo?.status === "complete") {
                          try {
                            const response = await fetch(`/api/repositories/${currentRepository.id}/download?userEmail=${encodeURIComponent(safeUser?.email || '')}`);
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${currentRepository.name}-v1.0.zip`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                            
                            toast({
                              title: "Download Started",
                              description: "Your repository ZIP file is downloading.",
                            });
                          } catch (error) {
                            toast({
                              title: "Download Failed", 
                              description: "Please try again or refresh the page.",
                              variant: "destructive",
                            });
                          }
                        }
                      }}
                    >
                      {currentRepository?.status === "complete" ? (
                        <>
                          <span className="hidden sm:inline mr-1">Download</span>
                          ZIP
                        </>
                      ) : currentRepository?.status === "generating" ? (
                        <>
                          <span className="hidden sm:inline mr-1">Generating</span>
                          {currentRepository.progress || 0}%
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline mr-1">Pending</span>
                          ZIP
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <Button 
                  onClick={() => navigate('/auth')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Authentication Status Banner */}
        {!user && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 rounded-full p-2">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Sign in for Full Access</h3>
                  <p className="text-gray-600">
                    Download generated repositories, save configurations, and access advanced features
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Sign In with Google
              </Button>
            </div>
          </div>
        )}

        {!currentRepository ? (
          <div className="space-y-8">
            {/* Hero Section with Search */}
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Cloud Database Demo Generator
              </h2>
              <p className="text-xl text-gray-600 mb-4 max-w-3xl mx-auto">
                Complete AWS relational database demonstrations for technical sales and customer presentations
              </p>
              <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
                Download production-ready PostgreSQL repositories with CloudFormation, sample data, and migration scripts
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

            {/* Current Focus & Roadmap Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <Card className="text-center border-2 border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-blue-600 mb-2">PostgreSQL</div>
                  <div className="text-sm text-gray-600">AWS RDS Focus</div>
                  <Badge className="mt-2 bg-blue-100 text-blue-800">Current</Badge>
                </CardContent>
              </Card>
              <Card className="text-center border-2 border-green-200">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-green-600 mb-2">5</div>
                  <div className="text-sm text-gray-600">Demo Templates</div>
                  <Badge variant="secondary" className="mt-2 bg-green-100 text-green-800">Available</Badge>
                </CardContent>
              </Card>
              <Card className="text-center border-2 border-gray-200">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-gray-500 mb-2">MySQL</div>
                  <div className="text-sm text-gray-600">RDS Expansion</div>
                  <Badge variant="secondary" className="mt-2 bg-gray-100 text-gray-500">Planned</Badge>
                </CardContent>
              </Card>
              <Card className="text-center border-2 border-orange-200">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-orange-500 mb-2">NoSQL</div>
                  <div className="text-sm text-gray-600">Multi-Cloud</div>
                  <Badge variant="secondary" className="mt-2 bg-orange-100 text-orange-800">Future</Badge>
                </CardContent>
              </Card>
            </div>



            {/* Featured Use Cases */}
            <div className="bg-white rounded-lg shadow-sm p-8 mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">AWS RDS PostgreSQL Demonstrations</h3>
              <p className="text-gray-600 mb-8">Production-ready scenarios for technical sales and customer presentations</p>
              
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

            {/* Strategic Roadmap */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Platform Roadmap</h3>
              <p className="text-gray-600 mb-8">Our strategic expansion plan to serve database professionals across all major cloud platforms</p>
              
              <div className="grid md:grid-cols-3 gap-6">
                {/* Phase 1 - Current */}
                <Card className="border-2 border-blue-300 bg-blue-50">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</div>
                      <div>
                        <h4 className="font-semibold text-blue-900">Phase 1 - Current</h4>
                        <Badge className="bg-blue-600 text-white">Live Now</Badge>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Database className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-sm">AWS RDS PostgreSQL</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-sm">Cloud Database SEs</span>
                      </div>
                      <div className="flex items-center">
                        <Zap className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-sm">SQL Optimization Tools</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Phase 2 - Near Term */}
                <Card className="border-2 border-green-300 bg-green-50">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</div>
                      <div>
                        <h4 className="font-semibold text-green-900">Phase 2 - Next</h4>
                        <Badge variant="secondary" className="bg-green-200 text-green-800">Q2 2025</Badge>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Database className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-sm">MySQL & MariaDB</span>
                      </div>
                      <div className="flex items-center">
                        <Code className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-sm">SQL Converter Tools</span>
                      </div>
                      <div className="flex items-center">
                        <Settings className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-sm">Schema Design Tools</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Phase 3 - Future */}
                <Card className="border-2 border-purple-300 bg-purple-50">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">3</div>
                      <div>
                        <h4 className="font-semibold text-purple-900">Phase 3 - Future</h4>
                        <Badge variant="secondary" className="bg-purple-200 text-purple-800">2025+</Badge>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Cloud className="h-4 w-4 text-purple-600 mr-2" />
                        <span className="text-sm">Multi-Cloud Support</span>
                      </div>
                      <div className="flex items-center">
                        <Database className="h-4 w-4 text-purple-600 mr-2" />
                        <span className="text-sm">NoSQL Databases</span>
                      </div>
                      <div className="flex items-center">
                        <Brain className="h-4 w-4 text-purple-600 mr-2" />
                        <span className="text-sm">AI-Powered Tools</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Tabbed Categories */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-12">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="available-use-cases">Available Use Cases</TabsTrigger>
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

            {/* Configuration Panel */}
            <ConfigurationPanel 
              onRepositoryCreate={setCurrentRepository}
              currentRepository={currentRepository}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <ProgressTracker repository={currentRepository} />
            </div>
            
            <div className="lg:col-span-3">
              <Tabs defaultValue="structure" className="bg-white rounded-lg shadow-sm">
                <div className="border-b border-gray-200">
                  <TabsList className="w-full bg-transparent justify-start h-auto p-0 border-b-0">
                    <TabsTrigger 
                      value="structure"
                      className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none py-4 px-6"
                    >
                      <i className="fas fa-folder-tree mr-2"></i>
                      File Structure
                    </TabsTrigger>
                    <TabsTrigger 
                      value="modules"
                      className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none py-4 px-6"
                    >
                      <i className="fas fa-graduation-cap mr-2"></i>
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
            </div>
          </div>
        )}
      </div>
      
      {/* Developer Tools Section */}
      {!currentRepository && (
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Database SE Toolkit
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Essential tools for cloud database sales engineers and technical professionals
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="hover:shadow-lg transition-all duration-300 border-2 border-blue-200 hover:border-blue-300 cursor-pointer group" onClick={() => navigate('/sql-optimizer')}>
                <CardContent className="p-8 text-center">
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto group-hover:bg-blue-200 transition-colors">
                      <Zap className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    PostgreSQL Query Optimizer
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Live demo tool for showing PostgreSQL performance optimization to customers
                  </p>
                  <div className="flex justify-center space-x-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">Phase 1</Badge>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Available</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-2 border-green-200 bg-green-50 opacity-90">
                <CardContent className="p-8 text-center">
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <Code className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <h4 className="text-xl font-semibold text-green-800 mb-3">
                    SQL Dialect Converter
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Convert between PostgreSQL, MySQL, and other database syntaxes for migration demos
                  </p>
                  <div className="flex justify-center space-x-2">
                    <Badge variant="secondary" className="bg-green-200 text-green-800">Phase 2</Badge>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">Q2 2025</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-2 border-purple-200 bg-purple-50 opacity-75">
                <CardContent className="p-8 text-center">
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                      <Brain className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                  <h4 className="text-xl font-semibold text-purple-800 mb-3">
                    AI Migration Assistant
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Intelligent multi-cloud database migration planning and cost optimization
                  </p>
                  <div className="flex justify-center space-x-2">
                    <Badge variant="secondary" className="bg-purple-200 text-purple-800">Phase 3</Badge>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-500">2025+</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Feedback & Demo Request Section */}
      <div className="bg-white dark:bg-gray-900 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Need a Custom Demo?
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Request specific database scenarios or provide feedback to help us prioritize features
            </p>
          </div>
          
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <form className="space-y-6" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  email: formData.get('email'),
                  demoType: formData.get('demoType'),
                  priority: formData.get('priority'),
                  message: formData.get('message')
                };
                
                try {
                  const response = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                  });
                  
                  if (response.ok) {
                    toast({
                      title: "Request Submitted",
                      description: "Thank you! We'll review your request and get back to you soon.",
                    });
                    (e.target as HTMLFormElement).reset();
                  } else {
                    throw new Error('Failed to submit');
                  }
                } catch (error) {
                  toast({
                    title: "Submission Failed",
                    description: "Please try again or contact us directly.",
                    variant: "destructive",
                  });
                }
              }}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      placeholder="your.email@company.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Demo Type
                    </label>
                    <select
                      name="demoType"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">Select demo type</option>
                      <option value="Custom PostgreSQL">Custom PostgreSQL Demo</option>
                      <option value="MySQL Migration">MySQL Migration Demo</option>
                      <option value="NoSQL Integration">NoSQL Integration Demo</option>
                      <option value="Multi-Cloud">Multi-Cloud Database Demo</option>
                      <option value="Performance Optimization">Performance Optimization Demo</option>
                      <option value="Custom Use Case">Custom Use Case</option>
                      <option value="General Feedback">General Feedback</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority Level
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input type="radio" name="priority" value="low" className="mr-2" />
                      <span className="text-sm">Low</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="priority" value="medium" defaultChecked className="mr-2" />
                      <span className="text-sm">Medium</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="priority" value="high" className="mr-2" />
                      <span className="text-sm">High</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Details & Requirements
                  </label>
                  <textarea
                    name="message"
                    rows={4}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    placeholder="Describe your specific needs, target audience, technical requirements, or feedback..."
                  ></textarea>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Submit Request
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 pt-8 pb-6">
        <div className="text-center text-sm text-gray-600">
          Built with ❤️ as a personal project to help developers move faster.<br/>
          Disclaimer: This app is independently created and not associated with any company, employer, or vendor. All trademarks and brand names used are for identification purposes only.
        </div>
      </footer>
    </div>
  );
}