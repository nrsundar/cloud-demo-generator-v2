import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Repository } from "@shared/schema";

interface ProgressTrackerProps {
  repository: Repository;
}

export default function ProgressTracker({ repository }: ProgressTrackerProps) {
  // Poll for repository updates when generating or queued
  const { data: updatedRepository } = useQuery({
    queryKey: ["/api/repositories", repository.id],
    refetchInterval: (repository.status === "generating" || repository.status === "queued") ? 1000 : false,
    initialData: repository,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return "fas fa-check-circle text-accent";
      case "generating":
        return "fas fa-spinner fa-spin text-yellow-600";
      case "queued":
        return "fas fa-hourglass-half text-blue-600";
      case "error":
        return "fas fa-exclamation-triangle text-red-600";
      default:
        return "fas fa-clock text-gray-400";
    }
  };

  const progressSteps = [
    { name: "Structure", completed: updatedRepository.progress >= 25 },
    { name: "Documentation", completed: updatedRepository.progress >= 50 },
    { name: "Code Examples", completed: updatedRepository.progress >= 75 },
    { name: "Datasets", completed: updatedRepository.progress >= 100 },
  ];

  const getStatusMessage = () => {
    switch (updatedRepository.status) {
      case "queued":
        return "Queued for generation - waiting for current job to complete";
      case "generating":
        return "Generating repository files and content";
      case "complete":
        return "Repository generation completed successfully";
      case "error":
        return "Generation failed - please try again";
      default:
        return "Ready to generate";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Generation Progress</CardTitle>
          <div className="flex items-center space-x-2">
            {updatedRepository.status === "queued" && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                In Queue
              </span>
            )}
            <span className="text-sm font-medium text-accent">
              {updatedRepository.progress}% Complete
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">{getStatusMessage()}</p>
      </CardHeader>
      <CardContent>
        <Progress value={updatedRepository.progress} className="mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {progressSteps.map((step, index) => (
            <div 
              key={step.name}
              className={`flex items-center ${
                step.completed ? "text-accent" : "text-gray-400"
              }`}
            >
              <i className={getStatusIcon(step.completed ? "complete" : updatedRepository.status)} />
              <span className="ml-2">{step.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
