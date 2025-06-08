import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { FolderTree, Book, Code, Database } from "lucide-react";
import FileTree from "./file-tree";
import CodePreview from "./code-preview";
import type { Repository } from "@shared/schema";

interface RepositoryTabsProps {
  repository: Repository;
}

export default function RepositoryTabs({ repository }: RepositoryTabsProps) {
  const [activeTab, setActiveTab] = useState("structure");

  const modules = [
    {
      id: 1,
      name: "PostGIS Fundamentals",
      status: repository.progress > 25 ? "Generated" : "Pending",
      documents: 12,
      examples: 8,
      exercises: 5,
      estimatedHours: "4-6 hours"
    },
    {
      id: 2,
      name: "Spatial Data Types & Functions",
      status: repository.progress > 50 ? "Generated" : repository.progress > 25 ? "Generating" : "Pending",
      documents: 15,
      examples: 12,
      exercises: 8,
      estimatedHours: "6-8 hours"
    },
    {
      id: 3,
      name: "pg_route Introduction",
      status: repository.progress > 75 ? "Generated" : repository.progress > 50 ? "Generating" : "Pending",
      documents: 10,
      examples: 15,
      exercises: 6,
      estimatedHours: "5-7 hours"
    },
    {
      id: 4,
      name: "Network Topology Creation",
      status: repository.progress >= 100 ? "Generated" : "Pending",
      documents: 14,
      examples: 18,
      exercises: 10,
      estimatedHours: "8-10 hours"
    }
  ];

  const datasets = [
    {
      name: "NYC Road Network",
      description: "Manhattan street grid",
      format: "GeoJSON",
      size: "2.4 MB",
      features: "12,847",
      icon: "🛣️",
      status: repository.progress > 75 ? "Generated" : "Processing"
    },
    {
      name: "Transit Routes",
      description: "Bus and subway lines",
      format: "GTFS",
      size: "8.1 MB",
      features: "472",
      icon: "🚌",
      status: repository.progress > 85 ? "Generated" : "Processing"
    },
    {
      name: "POI Database",
      description: "Points of interest",
      format: "CSV",
      size: "1.2 MB",
      features: "5,632",
      icon: "📍",
      status: repository.progress >= 100 ? "Generated" : "Queued"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Generated": return "bg-accent text-white";
      case "Generating": return "bg-yellow-500 text-white";
      case "Processing": return "bg-yellow-500 text-white";
      default: return "bg-gray-400 text-white";
    }
  };

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-gray-200">
          <TabsList className="w-full justify-start bg-transparent p-0 h-auto">
            <TabsTrigger
              value="structure"
              className="flex items-center px-6 py-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent"
            >
              <FolderTree className="w-4 h-4 mr-2" />
              Repository Structure
            </TabsTrigger>
            <TabsTrigger
              value="modules"
              className="flex items-center px-6 py-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent"
            >
              <Book className="w-4 h-4 mr-2" />
              Learning Modules
            </TabsTrigger>
            <TabsTrigger
              value="code"
              className="flex items-center px-6 py-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent"
            >
              <Code className="w-4 h-4 mr-2" />
              Code Preview
            </TabsTrigger>
            <TabsTrigger
              value="datasets"
              className="flex items-center px-6 py-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent"
            >
              <Database className="w-4 h-4 mr-2" />
              Sample Data
            </TabsTrigger>
          </TabsList>
        </div>

        <CardContent className="p-6">
          <TabsContent value="structure" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated File Structure</h3>
                <FileTree structure={repository.structure} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Repository Statistics</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Total Files</span>
                      <span className="text-2xl font-bold text-primary">247</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Learning Modules</span>
                      <span className="text-2xl font-bold text-accent">10</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Code Examples</span>
                      <span className="text-2xl font-bold text-orange-500">86</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Estimated Size</span>
                      <span className="text-2xl font-bold text-purple-500">~45MB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="modules" className="mt-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Learning Path Overview</h3>
            <div className="space-y-4">
              {modules.map((module) => (
                <div key={module.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="bg-primary text-white px-2 py-1 rounded text-xs font-medium mr-3">
                          {module.id.toString().padStart(2, '0')}
                        </span>
                        <h4 className="text-lg font-semibold text-gray-900">{module.name}</h4>
                        <span className={`ml-auto px-2 py-1 rounded-full text-xs ${getStatusColor(module.status)}`}>
                          {module.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">
                        {module.id === 1 && "Introduction to spatial databases, installation, and basic concepts."}
                        {module.id === 2 && "Deep dive into geometry and geography types, spatial operations."}
                        {module.id === 3 && "Setting up pg_route, basic routing algorithms, shortest path."}
                        {module.id === 4 && "Building and managing network topologies for routing."}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>📄 {module.documents} Documents</span>
                        <span>💻 {module.examples} Examples</span>
                        <span>🔬 {module.exercises} Exercises</span>
                        <span>⏱️ {module.estimatedHours}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="code" className="mt-0">
            <CodePreview repository={repository} />
          </TabsContent>

          <TabsContent value="datasets" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {datasets.map((dataset, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <span className="text-xl mr-3">{dataset.icon}</span>
                    <div>
                      <h4 className="font-semibold text-gray-900">{dataset.name}</h4>
                      <p className="text-sm text-gray-600">{dataset.description}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Format:</span>
                      <span className="font-medium">{dataset.format}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Size:</span>
                      <span className="font-medium">{dataset.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Features:</span>
                      <span className="font-medium">{dataset.features}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getStatusColor(dataset.status)}`}>
                      {dataset.status === "Generated" && "✅ Generated"}
                      {dataset.status === "Processing" && "⏳ Processing"}
                      {dataset.status === "Queued" && "⏰ Queued"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Sample Data Preview</h4>
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm overflow-auto">
                <div className="mb-2 text-gray-600">// NYC Road Network Sample (GeoJSON)</div>
                <pre><code>{`{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": 1,
        "name": "Broadway",
        "type": "primary",
        "oneway": false,
        "speed_limit": 25
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [-73.9857, 40.7484],
          [-73.9847, 40.7494],
          [-73.9837, 40.7504]
        ]
      }
    }
  ]
}`}</code></pre>
              </div>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
