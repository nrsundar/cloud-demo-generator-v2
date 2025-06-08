import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, HourglassIcon } from "lucide-react";
import type { Repository, GenerationLog } from "@shared/schema";

interface ProgressBarProps {
  repository: Repository;
}

export default function ProgressBar({ repository }: ProgressBarProps) {
  const { data: logs } = useQuery<GenerationLog[]>({
    queryKey: ['/api/repositories', repository.id, 'logs'],
    refetchInterval: repository.status === 'generating' ? 2000 : false,
  });

  const steps = [
    { key: "structure", label: "Structure", completed: repository.progress > 25 },
    { key: "documentation", label: "Documentation", completed: repository.progress > 50 },
    { key: "code", label: "Code Examples", completed: repository.progress > 75 },
    { key: "datasets", label: "Datasets", completed: repository.progress >= 100 }
  ];

  const getStepIcon = (completed: boolean, isActive: boolean) => {
    if (completed) return <CheckCircle className="w-4 h-4 text-accent" />;
    if (isActive) return <Clock className="w-4 h-4 text-yellow-600" />;
    return <HourglassIcon className="w-4 h-4 text-gray-400" />;
  };

  const getStepColor = (completed: boolean, isActive: boolean) => {
    if (completed) return "text-accent";
    if (isActive) return "text-yellow-600";
    return "text-gray-400";
  };

  return (
    <Card className="bg-white shadow-sm border border-gray-200 mb-8">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Generation Progress</h3>
          <span className="text-sm font-medium text-accent">
            {repository.progress}% Complete
          </span>
        </div>
        
        <Progress value={repository.progress} className="mb-3" />
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {steps.map((step, index) => {
            const isActive = !step.completed && repository.progress > (index * 25);
            return (
              <div
                key={step.key}
                className={`flex items-center ${getStepColor(step.completed, isActive)}`}
              >
                {getStepIcon(step.completed, isActive)}
                <span className="ml-2">{step.label}</span>
              </div>
            );
          })}
        </div>

        {/* Recent log messages */}
        {logs && logs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-600">
              Latest: {logs[logs.length - 1]?.message || "Initializing..."}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
