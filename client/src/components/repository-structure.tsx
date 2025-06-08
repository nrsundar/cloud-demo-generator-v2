import { useQuery } from "@tanstack/react-query";
import FileTree from "@/components/file-tree";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Repository, RepositoryStats } from "@shared/schema";

interface RepositoryStructureProps {
  repository: Repository;
}

export default function RepositoryStructure({ repository }: RepositoryStructureProps) {
  const { data: stats } = useQuery<RepositoryStats>({
    queryKey: ["/api/repositories", repository.id, "stats"],
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* File Tree */}
      <div>
        <CardTitle className="text-lg mb-4">Generated File Structure</CardTitle>
        <FileTree files={repository.generatedFiles || []} />
      </div>
      
      {/* Statistics */}
      <div>
        <CardTitle className="text-lg mb-4">Repository Statistics</CardTitle>
        <div className="space-y-4">
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total Files</span>
                <span className="text-2xl font-bold text-primary">{stats?.totalFiles || 0}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Learning Modules</span>
                <span className="text-2xl font-bold text-accent">{stats?.modules || 0}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Code Examples</span>
                <span className="text-2xl font-bold text-orange-500">{stats?.codeExamples || 0}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Estimated Size</span>
                <span className="text-2xl font-bold text-purple-500">{stats?.estimatedSize || "0MB"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
