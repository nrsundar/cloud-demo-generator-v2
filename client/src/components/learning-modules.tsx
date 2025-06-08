import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LearningModule } from "@shared/schema";

interface LearningModulesProps {
  repositoryId: number;
}

export default function LearningModules({ repositoryId }: LearningModulesProps) {
  const { data: modules = [] } = useQuery<LearningModule[]>({
    queryKey: ["/api/repositories", repositoryId, "modules"],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return <Badge className="bg-accent text-white">Generated</Badge>;
      case "generating":
        return <Badge className="bg-yellow-500 text-white">Generating</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div>
      <CardTitle className="text-lg mb-6">Learning Path Overview</CardTitle>
      <div className="space-y-4">
        {modules.map((module) => (
          <Card key={module.id} className="border border-gray-200 hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Badge variant="default" className="mr-3 bg-primary text-white">
                      {module.id}
                    </Badge>
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                    <div className="ml-auto">
                      {getStatusBadge(module.status)}
                    </div>
                  </div>
                  <p className="text-gray-600 mb-3">{module.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>
                      <i className="fas fa-file-alt mr-1"></i>
                      {module.documents} Documents
                    </span>
                    <span>
                      <i className="fas fa-code mr-1"></i>
                      {module.examples} Examples
                    </span>
                    <span>
                      <i className="fas fa-tasks mr-1"></i>
                      {module.exercises} Exercises
                    </span>
                    <span>
                      <i className="fas fa-clock mr-1"></i>
                      {module.estimatedHours}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
