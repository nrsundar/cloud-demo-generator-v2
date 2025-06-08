import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Settings, Sparkles } from "lucide-react";
import type { Repository } from "@shared/schema";

interface ConfigurationSidebarProps {
  onCreateRepository: (config: any) => void;
  isCreating: boolean;
  onGenerate: () => void;
  isGenerating: boolean;
  repository?: Repository | null;
}

export default function ConfigurationSidebar({
  onCreateRepository,
  isCreating,
  onGenerate,
  isGenerating,
  repository
}: ConfigurationSidebarProps) {
  const [config, setConfig] = useState({
    name: "pgroute-postgis-guide",
    programmingLanguage: "Python",
    databaseVersion: "PostgreSQL 15 + PostGIS 3.4",
    useCases: ["Transportation", "Logistics"],
    complexityLevel: "Beginner to Advanced"
  });

  const handleUseCaseChange = (useCase: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      useCases: checked
        ? [...prev.useCases, useCase]
        : prev.useCases.filter(uc => uc !== useCase)
    }));
  };

  const handleSubmit = () => {
    onCreateRepository(config);
  };

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Settings className="text-primary w-5 h-5 mr-2" />
          Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Repository Settings */}
        <div>
          <Label htmlFor="repo-name" className="text-sm font-medium text-gray-700 mb-2">
            Repository Name
          </Label>
          <Input
            id="repo-name"
            value={config.name}
            onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
            className="font-mono text-sm"
            disabled={!!repository}
          />
        </div>
        
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2">
            Programming Language
          </Label>
          <Select
            value={config.programmingLanguage}
            onValueChange={(value) => setConfig(prev => ({ ...prev, programmingLanguage: value }))}
            disabled={!!repository}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Python">Python</SelectItem>
              <SelectItem value="Node.js">Node.js</SelectItem>
              <SelectItem value="Java">Java</SelectItem>
              <SelectItem value="Multiple Languages">Multiple Languages</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2">
            Database Version
          </Label>
          <Select
            value={config.databaseVersion}
            onValueChange={(value) => setConfig(prev => ({ ...prev, databaseVersion: value }))}
            disabled={!!repository}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PostgreSQL 15 + PostGIS 3.4">PostgreSQL 15 + PostGIS 3.4</SelectItem>
              <SelectItem value="PostgreSQL 14 + PostGIS 3.3">PostgreSQL 14 + PostGIS 3.3</SelectItem>
              <SelectItem value="PostgreSQL 13 + PostGIS 3.2">PostgreSQL 13 + PostGIS 3.2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2">
            Use Case Focus
          </Label>
          <div className="space-y-2">
            {["Transportation", "Logistics", "Urban Planning"].map((useCase) => (
              <div key={useCase} className="flex items-center space-x-2">
                <Checkbox
                  id={useCase}
                  checked={config.useCases.includes(useCase)}
                  onCheckedChange={(checked) => handleUseCaseChange(useCase, !!checked)}
                  disabled={!!repository}
                />
                <Label htmlFor={useCase} className="text-sm">
                  {useCase}
                </Label>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2">
            Complexity Level
          </Label>
          <RadioGroup
            value={config.complexityLevel}
            onValueChange={(value) => setConfig(prev => ({ ...prev, complexityLevel: value }))}
            disabled={!!repository}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Beginner to Advanced" id="beginner-advanced" />
              <Label htmlFor="beginner-advanced" className="text-sm">
                Beginner to Advanced
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Intermediate+" id="intermediate" />
              <Label htmlFor="intermediate" className="text-sm">
                Intermediate+
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Advanced Only" id="advanced" />
              <Label htmlFor="advanced" className="text-sm">
                Advanced Only
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        {!repository ? (
          <Button
            onClick={handleSubmit}
            disabled={isCreating}
            className="w-full bg-accent hover:bg-green-600 text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isCreating ? "Creating..." : "Create Repository"}
          </Button>
        ) : repository.status === 'pending' ? (
          <Button
            onClick={onGenerate}
            disabled={isGenerating}
            className="w-full bg-accent hover:bg-green-600 text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate Repository"}
          </Button>
        ) : (
          <div className="text-center text-sm text-gray-600">
            Repository {repository.status}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
