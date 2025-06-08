import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Settings, Download, Code, Database, BookOpen, FolderTree } from "lucide-react";
import ConfigurationPanel from "@/components/configuration-panel";
import RepositoryStructure from "@/components/repository-structure";
import LearningModules from "@/components/learning-modules";
import CodePreview from "@/components/code-preview";
import DatasetsPreview from "@/components/datasets-preview";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RepositoryConfig } from "@shared/schema";

export default function RepositoryGenerator() {
  const [currentRepositoryId, setCurrentRepositoryId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("structure");
  const [showCreateForm, setShowCreateForm] = useState(true);
  const { toast } = useToast();

  // Get current repository data
  const { data: repository, isLoading: repositoryLoading } = useQuery({
    queryKey: ["/api/repositories", currentRepositoryId],
    enabled: !!currentRepositoryId,
    refetchInterval: (data) => {
      // Poll while generation is in progress
      return data?.status === "generating" || data?.job?.status === "running" ? 1000 : false;
    },
  });

  // Get repository preview
  const { data: preview } = useQuery({
    queryKey: ["/api/repositories", currentRepositoryId, "preview"],
    enabled: !!currentRepositoryId,
  });

  // Create repository mutation
  const createRepositoryMutation = useMutation({
    mutationFn: async (config: RepositoryConfig) => {
      const res = await apiRequest("POST", "/api/repositories", config);
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentRepositoryId(data.id);
      toast({
        title: "Repository Created",
        description: "Your repository configuration has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create repository configuration.",
        variant: "destructive",
      });
    },
  });

  // Generate repository mutation
  const generateRepositoryMutation = useMutation({
    mutationFn: async (repositoryId: number) => {
      const res = await apiRequest("POST", `/api/repositories/${repositoryId}/generate`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Generation Started",
        description: "Your repository is being generated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/repositories", currentRepositoryId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start repository generation.",
        variant: "destructive",
      });
    },
  });

  const handleConfigSubmit = (config: RepositoryConfig) => {
    createRepositoryMutation.mutate(config);
  };

  const handleNewRepository = () => {
    setCurrentRepositoryId(null);
    setShowCreateForm(true);
    setActiveTab("structure");
  };

  const handleGenerate = () => {
    if (currentRepositoryId) {
      generateRepositoryMutation.mutate(currentRepositoryId);
    }
  };

  const handleDownload = async () => {
    if (currentRepositoryId && repository?.status === "complete") {
      try {
        const response = await fetch(`/api/repositories/${currentRepositoryId}/download`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${repository.name}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Download Started",
          description: "Your repository is being downloaded.",
        });
      } catch (error) {
        toast({
          title: "Download Failed",
          description: "Failed to download the repository.",
          variant: "destructive",
        });
      }
    }
  };

  const getProgressStatus = () => {
    if (!repository) return { progress: 0, status: "Not Started" };
    
    if (repository.status === "complete") {
      return { progress: 100, status: "100% Complete" };
    } else if (repository.status === "failed") {
      return { progress: 0, status: "Generation Failed" };
    } else if (repository.job?.status === "running") {
      return { 
        progress: repository.progress || 0, 
        status: `${repository.progress || 0}% Complete` 
      };
    } else {
      return { progress: 0, status: "Ready to Generate" };
    }
  };

  const progressInfo = getProgressStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 rounded-lg p-2">
                <MapPin className="text-white h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">pg_route & PostGIS</h1>
                <p className="text-sm text-gray-600">Repository Generator</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-1">
                <Code className="text-blue-600 h-4 w-4" />
                <span className="text-sm font-medium">v2.1.0</span>
              </div>
              <Button 
                onClick={handleDownload}
                disabled={repository?.status !== "completed"}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Repository
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Configuration Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Settings className="text-blue-600 mr-2 h-5 w-5" />
                  Configuration
                </h2>
                
                {showCreateForm ? (
                  <ConfigurationPanel 
                    onRepositoryCreate={handleConfigSubmit}
                    currentRepository={null}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Repository Created</h3>
                      <Button onClick={handleNewRepository} variant="outline" size="sm">
                        Create New
                      </Button>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-green-800">Repository successfully created and ready for generation.</p>
                    </div>
                  </div>
                )}
                
                {currentRepositoryId && (
                  <Button 
                    onClick={handleGenerate}
                    disabled={generateRepositoryMutation.isPending || repository?.status === "generating"}
                    className="w-full mt-6 bg-green-600 hover:bg-green-700"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    {generateRepositoryMutation.isPending ? "Starting..." : "Generate Repository"}
                  </Button>
                )}
              </div>
            </Card>
          </div>
          
          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {/* Progress Section */}
            {repository && (
              <Card className="p-6 mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Generation Progress</h3>
                  <Badge variant={repository.status === "completed" ? "default" : "secondary"}>
                    {progressInfo.status}
                  </Badge>
                </div>
                <Progress value={progressInfo.progress} className="mb-3" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center text-green-600">
                    <div className="w-2 h-2 bg-green-600 rounded-full mr-2" />
                    <span>Structure</span>
                  </div>
                  <div className="flex items-center text-green-600">
                    <div className="w-2 h-2 bg-green-600 rounded-full mr-2" />
                    <span>Documentation</span>
                  </div>
                  <div className="flex items-center text-green-600">
                    <div className="w-2 h-2 bg-green-600 rounded-full mr-2" />
                    <span>Code Examples</span>
                  </div>
                  <div className="flex items-center text-yellow-600">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full mr-2" />
                    <span>Datasets</span>
                  </div>
                </div>
              </Card>
            )}
            
            {/* Tabbed Interface */}
            <Card>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="border-b border-gray-200">
                  <TabsList className="h-auto p-0 bg-transparent">
                    <TabsTrigger 
                      value="structure" 
                      className="flex items-center px-6 py-4 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none"
                    >
                      <FolderTree className="mr-2 h-4 w-4" />
                      Repository Structure
                    </TabsTrigger>
                    <TabsTrigger 
                      value="modules"
                      className="flex items-center px-6 py-4 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none"
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      Learning Modules
                    </TabsTrigger>
                    <TabsTrigger 
                      value="code"
                      className="flex items-center px-6 py-4 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none"
                    >
                      <Code className="mr-2 h-4 w-4" />
                      Code Preview
                    </TabsTrigger>
                    <TabsTrigger 
                      value="datasets"
                      className="flex items-center px-6 py-4 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none"
                    >
                      <Database className="mr-2 h-4 w-4" />
                      Sample Data
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <div className="p-6">
                  <TabsContent value="structure" className="mt-0">
                    <RepositoryStructure 
                      preview={preview}
                      repository={repository}
                    />
                  </TabsContent>
                  
                  <TabsContent value="modules" className="mt-0">
                    <LearningModules 
                      repository={repository}
                    />
                  </TabsContent>
                  
                  <TabsContent value="code" className="mt-0">
                    <CodePreview 
                      repositoryId={currentRepositoryId}
                      repository={repository}
                    />
                  </TabsContent>
                  
                  <TabsContent value="datasets" className="mt-0">
                    <DatasetsPreview 
                      repositoryId={currentRepositoryId}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </Card>
          </div>
        </div>
        
        {/* Footer Actions */}
        {repository && (
          <Card className="mt-12 p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="text-blue-600 mr-2 h-4 w-4" />
                  <span>Repository will be packaged as a ZIP file with all dependencies</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Button variant="outline">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Preview README
                </Button>
                <Button 
                  onClick={handleDownload}
                  disabled={repository.status !== "complete"}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Repository ({preview?.statistics?.totalSize ? Math.round(preview.statistics.totalSize / 1024 / 1024) : 45}MB)
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
