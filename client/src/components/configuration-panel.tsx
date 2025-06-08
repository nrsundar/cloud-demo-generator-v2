import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { insertRepositorySchema, type Repository } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const formSchema = insertRepositorySchema.extend({
  useCases: z.array(z.string()).min(1, "Select one use case"),
});

interface ConfigurationPanelProps {
  onRepositoryCreate: (repository: Repository) => void;
  currentRepository: Repository | null;
}

export default function ConfigurationPanel({ onRepositoryCreate, currentRepository }: ConfigurationPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      language: "Python",
      databaseVersion: "PostgreSQL 16",
      useCases: [],
      complexityLevel: "intermediate",
    },
  });

  // Generate repository name based on use cases
  const generateRepositoryName = (useCases: string[], language: string) => {
    if (useCases.length === 0) return "";
    
    const useCaseMap: Record<string, string> = {
      "Real Estate/Property Search": "postgis-property-search-demo",
      "Transportation & Routing": "pgroute-transportation-demo",
      "PostgreSQL Replication": "postgresql-replication-demo",
      "Data Migration & Upgrades": "postgresql-migration-demo",
      "JSON & Document Storage": "postgresql-jsonb-demo",
      "Time-Series Analytics": "postgresql-timeseries-demo",
      "Machine Learning & AI": "postgresql-ml-demo"
    };
    
    const primaryUseCase = useCases[0];
    const baseName = useCaseMap[primaryUseCase] || "postgresql-demo";
    const langSuffix = language.toLowerCase() === "python" ? "-py" : "-js";
    
    return `${baseName}${langSuffix}`;
  };

  // Watch for changes in use cases and language to update repository name
  const watchedUseCases = form.watch("useCases");
  const watchedLanguage = form.watch("language");
  const watchedDatabaseVersion = form.watch("databaseVersion");
  
  useEffect(() => {
    if (watchedUseCases?.length > 0 && !currentRepository) {
      const newName = generateRepositoryName(watchedUseCases, watchedLanguage || "Python");
      form.setValue("name", newName);
    }
  }, [watchedUseCases, watchedLanguage, currentRepository, form]);

  // Reset form when currentRepository is cleared
  useEffect(() => {
    if (!currentRepository) {
      form.reset({
        name: "",
        language: "Python",
        databaseVersion: "PostgreSQL 16",
        databaseType: "RDS",
        instanceType: "db.t3.medium",
        awsRegion: "us-west-2",
        useCases: [],
        complexityLevel: "intermediate"
      });
    }
  }, [currentRepository, form]);

  // Auto-set database type and instance type based on database version
  useEffect(() => {
    if (watchedDatabaseVersion && !currentRepository) {
      if (watchedDatabaseVersion.includes("Aurora")) {
        form.setValue("databaseType", "Aurora");
        form.setValue("instanceType", "db.r6g.large");
      } else {
        form.setValue("databaseType", "RDS");
        form.setValue("instanceType", "db.t3.medium");
      }
    }
  }, [watchedDatabaseVersion, currentRepository, form]);

  const generateRepositoryMutation = useMutation({
    mutationFn: async (repositoryId: number) => {
      const response = await apiRequest("POST", `/api/repositories/${repositoryId}/generate`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repositories"] });
    },
  });

  const createRepositoryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("POST", "/api/repositories", data);
      return response.json();
    },
    onSuccess: (repository: Repository) => {
      toast({
        title: "Repository Created",
        description: "Your repository configuration has been saved.",
      });
      onRepositoryCreate(repository);
      queryClient.invalidateQueries({ queryKey: ["/api/repositories"] });
      // Trigger repository generation
      generateRepositoryMutation.mutate(repository.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create repository. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createRepositoryMutation.mutate(data);
  };

  const useCaseCategories = [
    {
      title: "Available Use Cases",
      color: "blue",
      cases: [
        { name: "Real Estate/Property Search", enabled: true, description: "PostGIS spatial data types, GIST indexing, proximity queries. Demonstrates geospatial search, polygon containment, and distance calculations for property location services." },
        { name: "Data Migration & Upgrades", enabled: true, description: "CloudFormation infrastructure, AWS DMS setup, blue-green deployment patterns. Demonstrates automated migration from legacy systems to AWS RDS/Aurora PostgreSQL." },
        { name: "Transportation & Routing", enabled: true, description: "pgRouting extension, network topology, shortest path algorithms. Demonstrates route optimization and logistics applications for transportation systems." },
        { name: "Time-Series Analytics", enabled: true, description: "Native PostgreSQL partitioning, BRIN indexes, time-bucket aggregations. Demonstrates AWS-compatible time-series patterns without TimescaleDB dependency." }
      ]
    },
    {
      title: "High Availability & Scaling",
      color: "green", 
      cases: [
        { name: "PostgreSQL Replication", enabled: true, description: "Aurora read replicas, cross-region replication, automated failover configuration. Demonstrates high availability patterns and disaster recovery for AWS PostgreSQL environments." }
      ]
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repository Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Programming Language</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={!!currentRepository}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Python">Python</SelectItem>
                      <SelectItem value="JavaScript">JavaScript/Node.js</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="databaseVersion"
              render={({ field }) => {
                const watchedUseCases = form.watch("useCases") || [];
                const isTimeSeries = watchedUseCases.includes("Time-Series Analytics");
                const isPropertySearch = watchedUseCases.includes("Real Estate/Property Search");
                
                const getVersionOptions = () => {
                  if (isTimeSeries) {
                    return [
                      { value: "PostgreSQL 16", label: "PostgreSQL 16" },
                      { value: "PostgreSQL 15", label: "PostgreSQL 15" },
                      { value: "PostgreSQL 14", label: "PostgreSQL 14" },
                      { value: "Aurora PostgreSQL 16", label: "Aurora PostgreSQL 16" },
                      { value: "Aurora PostgreSQL 15", label: "Aurora PostgreSQL 15" },
                    ];
                  } else if (isPropertySearch) {
                    return [
                      { value: "PostgreSQL 15 + PostGIS 3.4", label: "PostgreSQL 15 + PostGIS 3.4" },
                      { value: "PostgreSQL 14 + PostGIS 3.3", label: "PostgreSQL 14 + PostGIS 3.3" },
                      { value: "PostgreSQL 13 + PostGIS 3.2", label: "PostgreSQL 13 + PostGIS 3.2" },
                      { value: "Aurora PostgreSQL 15 + PostGIS 3.4", label: "Aurora PostgreSQL 15 + PostGIS 3.4" },
                      { value: "Aurora PostgreSQL 14 + PostGIS 3.3", label: "Aurora PostgreSQL 14 + PostGIS 3.3" },
                    ];
                  } else {
                    return [
                      { value: "PostgreSQL 16", label: "PostgreSQL 16" },
                      { value: "PostgreSQL 15", label: "PostgreSQL 15" },
                      { value: "PostgreSQL 14", label: "PostgreSQL 14" },
                      { value: "Aurora PostgreSQL 16", label: "Aurora PostgreSQL 16" },
                      { value: "Aurora PostgreSQL 15", label: "Aurora PostgreSQL 15" },
                    ];
                  }
                };
                
                const versionOptions = getVersionOptions();
                
                return (
                  <FormItem>
                    <FormLabel>Database Version</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={!!currentRepository}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {versionOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="databaseType"
              render={({ field }) => {
                const isAurora = watchedDatabaseVersion?.includes("Aurora");
                const availableTypes = isAurora 
                  ? [{ value: "Aurora", label: "Aurora PostgreSQL (Cluster)" }]
                  : [{ value: "RDS", label: "Amazon RDS PostgreSQL (Single Instance)" }];
                
                return (
                  <FormItem>
                    <FormLabel>Database Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || (isAurora ? "Aurora" : "RDS")}
                      disabled={!!currentRepository}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="instanceType"
              render={({ field }) => {
                const isAurora = watchedDatabaseVersion?.includes("Aurora");
                const instanceTypes = isAurora 
                  ? [
                      { value: "db.r6g.large", label: "db.r6g.large (2 vCPU, 16GB RAM)" },
                      { value: "db.r6g.xlarge", label: "db.r6g.xlarge (4 vCPU, 32GB RAM)" },
                      { value: "db.r6g.2xlarge", label: "db.r6g.2xlarge (8 vCPU, 64GB RAM)" },
                      { value: "db.r6g.4xlarge", label: "db.r6g.4xlarge (16 vCPU, 128GB RAM)" }
                    ]
                  : [
                      { value: "db.t3.medium", label: "db.t3.medium (2 vCPU, 4GB RAM)" },
                      { value: "db.t3.large", label: "db.t3.large (2 vCPU, 8GB RAM)" },
                      { value: "db.m6i.large", label: "db.m6i.large (2 vCPU, 8GB RAM)" },
                      { value: "db.m6i.xlarge", label: "db.m6i.xlarge (4 vCPU, 16GB RAM)" },
                      { value: "db.m6i.2xlarge", label: "db.m6i.2xlarge (8 vCPU, 32GB RAM)" }
                    ];
                
                return (
                  <FormItem>
                    <FormLabel>Instance Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!!currentRepository}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {instanceTypes.map((instance) => (
                          <SelectItem key={instance.value} value={instance.value}>
                            {instance.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="awsRegion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AWS Region</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value || "us-west-2"}
                    disabled={!!currentRepository}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                      <SelectItem value="us-east-2">US East (Ohio)</SelectItem>
                      <SelectItem value="us-west-1">US West (N. California)</SelectItem>
                      <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                      <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                      <SelectItem value="eu-central-1">Europe (Frankfurt)</SelectItem>
                      <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                      <SelectItem value="ap-northeast-1">Asia Pacific (Tokyo)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="useCases"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Use Case Focus (Select One)</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value?.[0] || ""}
                      onValueChange={(value) => {
                        const selectedUseCase = useCaseCategories
                          .flatMap(cat => cat.cases)
                          .find(useCase => useCase.name === value);
                        
                        if (!selectedUseCase?.enabled) {
                          toast({
                            title: "Feature Not Available",
                            description: `${value} - This feature is not currently available`,
                            variant: "destructive",
                          });
                          return;
                        }
                        field.onChange([value]);
                      }}
                      disabled={!!currentRepository}
                      className="space-y-4"
                    >
                      {useCaseCategories.map((category) => (
                        <div key={category.title} className={`border rounded-lg p-3 bg-${category.color}-50`}>
                          <h4 className={`font-medium text-sm text-${category.color}-800 mb-2`}>
                            {category.title}
                          </h4>
                          <div className="space-y-2">
                            {category.cases.map((useCase) => (
                              <div key={useCase.name} className="flex items-center space-x-2">
                                <RadioGroupItem 
                                  value={useCase.name} 
                                  id={useCase.name}
                                  disabled={!useCase.enabled || !!currentRepository}
                                />
                                <label 
                                  htmlFor={useCase.name} 
                                  className={`text-sm font-normal cursor-pointer ${!useCase.enabled ? 'text-gray-500' : ''}`}
                                >
                                  {useCase.name}
                                  <div className="text-xs text-gray-600 mt-1">
                                    {useCase.description}
                                  </div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="complexityLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium flex items-center gap-2">
                    🧠 Complexity Level
                  </FormLabel>
                  <FormDescription className="text-sm text-muted-foreground mb-4">
                    Choose the type of PostgreSQL demo you'd like to generate:
                  </FormDescription>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!!currentRepository}
                      className="space-y-4"
                    >
                      <FormItem className="border rounded-lg p-4 bg-blue-50">
                        <div className="flex items-start space-x-3">
                          <FormControl>
                            <RadioGroupItem value="Beginner to Advanced" className="mt-1" />
                          </FormControl>
                          <div className="flex-1">
                            <FormLabel className="text-sm font-medium text-blue-800 cursor-pointer">
                              Learning Path (Beginner to Advanced)
                            </FormLabel>
                            <p className="text-xs text-blue-700 mt-1">
                              Build progressive examples that grow in complexity—from basic SQL concepts to advanced PostgreSQL features. Ideal for training, workshops, or onboarding.
                            </p>
                            <div className="mt-2">
                              <p className="text-xs font-medium text-blue-800 mb-1">Includes:</p>
                              <ul className="text-xs text-blue-700 space-y-1">
                                <li>• Step-by-step examples</li>
                                <li>• Focus on clarity and concepts</li>
                                <li>• Lightweight infrastructure</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </FormItem>
                      <FormItem className="border rounded-lg p-4 bg-green-50">
                        <div className="flex items-start space-x-3">
                          <FormControl>
                            <RadioGroupItem value="Professional" className="mt-1" />
                          </FormControl>
                          <div className="flex-1">
                            <FormLabel className="text-sm font-medium text-green-800 cursor-pointer">
                              Enterprise Blueprint (Production-Focused)
                            </FormLabel>
                            <p className="text-xs text-green-700 mt-1">
                              Generate demos designed for real-world use: secure, scalable, and aligned with production best practices. Ideal for architects, advanced users, and enterprise showcases.
                            </p>
                            <div className="mt-2">
                              <p className="text-xs font-medium text-green-800 mb-1">Includes:</p>
                              <ul className="text-xs text-green-700 space-y-1">
                                <li>• Optimized code and infra patterns</li>
                                <li>• Security and scalability baked in</li>
                                <li>• CI/CD and monitoring hooks</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Repository Name Field - Auto-generated based on use cases */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => {
                const watchedUseCases = form.watch("useCases") || [];
                const watchedLanguage = form.watch("language") || "JavaScript";
                const generatedName = generateRepositoryName(watchedUseCases, watchedLanguage);
                
                // Auto-update the field value when use cases or language changes
                React.useEffect(() => {
                  if (generatedName && !currentRepository) {
                    form.setValue("name", generatedName);
                  }
                }, [generatedName]);

                return (
                  <FormItem>
                    <FormLabel>Repository Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Generated automatically from use case selection..." 
                        {...field}
                        value={generatedName || field.value || ""}
                        disabled={!!currentRepository}
                        className="bg-gray-50"
                      />
                    </FormControl>
                    <p className="text-sm text-gray-500">
                      This name is automatically generated based on your selected use cases and programming language.
                    </p>
                  </FormItem>
                );
              }}
            />

            <Button 
              type="submit" 
              disabled={createRepositoryMutation.isPending}
              className="w-full"
            >
              {createRepositoryMutation.isPending ? "Creating..." : "Create Repository"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}