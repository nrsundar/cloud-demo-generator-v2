import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Download, 
  GitBranch, 
  Shield, 
  Zap, 
  Code, 
  Cloud, 
  Settings,
  FileText,
  Users,
  MapPin,
  TrendingUp,
  Brain,
  BarChart3,
  Clock,
  Star
} from 'lucide-react';
import { useLocation } from 'wouter';
import { signInWithGoogle } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (error) {
      toast({
        title: "Sign-in Error",
        description: error instanceof Error ? error.message : "Failed to sign in. Please try again.",
        variant: "destructive",
      });
    }
  };

  const features = [
    {
      icon: Brain,
      title: "🤖 AI-Powered Smart Generator",
      description: "Each repo is intelligently assembled based on your selected use case, complexity level, and deployment preferences — using an AI-driven config engine."
    },
    {
      icon: Cloud,
      title: "AWS Cloud Infrastructure",
      description: "Complete CloudFormation and Terraform templates for AWS services including Amazon RDS, Aurora, Lambda, ECS, and more with production-ready configurations."
    },
    {
      icon: Code,
      title: "Multi-Language Support",
      description: "Generated code examples in Python, JavaScript, TypeScript, and Go with comprehensive documentation and best practices."
    },
    {
      icon: FileText,
      title: "Learning Modules",
      description: "Structured learning paths with exercises, documentation, and hands-on examples for different skill levels and cloud services."
    },
    {
      icon: Download,
      title: "Complete ZIP Packages",
      description: "Download ready-to-deploy repositories with infrastructure code, application code, and deployment scripts for any cloud service."
    },
    {
      icon: Shield,
      title: "Production Ready",
      description: "Security best practices, monitoring, and scalability features built into every generated cloud infrastructure demonstration."
    }
  ];

  const useCases = [
    {
      icon: MapPin,
      title: "Geospatial Analytics",
      description: "PostGIS-powered location analytics with real estate and mapping demonstrations",
      technologies: ["PostGIS", "QGIS", "Leaflet"],
      difficulty: "Intermediate"
    },
    {
      icon: TrendingUp,
      title: "Time-Series Analytics",
      description: "Financial data analysis with TimescaleDB extensions",
      technologies: ["TimescaleDB", "Grafana", "Python"],
      difficulty: "Advanced"
    },
    {
      icon: Brain,
      title: "Vector Database (pgVector)",
      description: "AI/ML applications with vector similarity search capabilities",
      technologies: ["pgVector", "OpenAI", "LangChain"],
      difficulty: "Advanced"
    },
    {
      icon: Users,
      title: "Multi-Tenant SaaS",
      description: "Scalable multi-tenant architecture with row-level security",
      technologies: ["RLS", "JWT", "REST API"],
      difficulty: "Advanced"
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Business intelligence with complex queries and reporting",
      technologies: ["Metabase", "PostgreSQL", "Docker"],
      difficulty: "Intermediate"
    },
    {
      icon: Cloud,
      title: "High Availability Setup",
      description: "Master-replica configurations with automatic failover",
      technologies: ["Aurora", "Read Replicas", "CloudWatch"],
      difficulty: "Advanced"
    }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "beginner": return "bg-green-100 text-green-800 border-green-200";
      case "intermediate": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "advanced": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 rounded-lg p-2">
                <Database className="text-white h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Cloud Demo Generator</h1>
                <p className="text-sm text-gray-600">Professional cloud infrastructure demonstrations</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={handleSignIn}
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                Sign In
              </Button>
              <Button 
                onClick={handleSignIn}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Generate Professional Cloud Infrastructure Demonstrations
          </h2>
          <div className="mb-4">
            <span className="text-lg font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              ⚡ Powered by AI • Tuned for developers
            </span>
          </div>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Build production-ready GitHub templates in seconds — powered by AI and real-world best practices. 
            Complete cloud infrastructure repositories with AWS services, learning modules, and deployment scripts.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-blue-800 font-medium">Currently supporting: Amazon RDS PostgreSQL & Aurora PostgreSQL</p>
            <p className="text-blue-600 text-sm mt-1">Expanding to all AWS services and multi-cloud platforms</p>
          </div>
          <div className="flex justify-center space-x-4">
            <Button 
              onClick={() => navigate('/auth')}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Start Creating Demos
            </Button>
            <Button 
              variant="outline"
              size="lg"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Everything You Need</h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comprehensive tooling for creating professional cloud infrastructure demonstrations
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-gray-200 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 rounded-lg p-2">
                      <feature.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Popular Use Cases</h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Ready-to-deploy demonstrations for various AWS cloud scenarios
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((useCase, index) => (
              <Card key={index} className="border-gray-200 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 rounded-lg p-2">
                        <useCase.icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <CardTitle className="text-lg">{useCase.title}</CardTitle>
                    </div>
                    <Badge className={`text-xs ${getDifficultyColor(useCase.difficulty)}`}>
                      {useCase.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-3">{useCase.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {useCase.technologies.map((tech, techIndex) => (
                      <Badge key={techIndex} variant="secondary" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to Create Your First AI-Generated Demo?
          </h3>
          <p className="text-xl text-blue-100 mb-8">
            Sign in with Google to start generating professional cloud infrastructure demonstrations with AI-powered intelligence
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={handleSignIn}
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 px-8"
            >
              Get Started Now
            </Button>
            <Button 
              onClick={handleSignIn}
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-blue-600 px-8"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center items-center space-x-2 mb-4">
              <Cloud className="h-6 w-6" />
              <span className="text-lg font-semibold">Cloud Demo Generator</span>
            </div>
            <p className="text-gray-400 mb-4">
              Professional cloud infrastructure demonstrations for customer presentations and training
            </p>
            <div className="flex justify-center items-center space-x-4 mb-4">
              <span className="text-sm text-gray-400">⚡ Powered by AI</span>
              <span className="text-gray-600">•</span>
              <span className="text-sm text-gray-400">Crafted by humans</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2024 PostgreSQL Demo Generator. For educational and demonstration purposes only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}