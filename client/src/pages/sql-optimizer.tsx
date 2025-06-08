import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, 
  Database, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  BarChart3,
  Target,
  Lightbulb,
  Code2
} from "lucide-react";

interface OptimizationResult {
  originalQuery: string;
  optimizedQuery: string;
  performanceGain: string;
  issues: string[];
  suggestions: string[];
  executionPlan: {
    before: string;
    after: string;
  };
}

export default function SqlOptimizer() {
  const [query, setQuery] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  const analyzeQuery = async () => {
    if (!query.trim()) return;
    
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock optimization result based on query content
    const mockResult: OptimizationResult = {
      originalQuery: query,
      optimizedQuery: generateOptimizedQuery(query),
      performanceGain: "73% faster execution",
      issues: [
        "Missing index on JOIN columns",
        "Inefficient WHERE clause ordering",
        "Unnecessary SELECT * usage"
      ],
      suggestions: [
        "Add composite index on (user_id, created_at)",
        "Use EXISTS instead of IN for subqueries",
        "Specify only required columns in SELECT"
      ],
      executionPlan: {
        before: "Seq Scan on orders (cost=0.00..18334.00 rows=1000000 width=8)",
        after: "Index Scan on orders_user_created_idx (cost=0.43..8.45 rows=1 width=8)"
      }
    };
    
    setResult(mockResult);
    setIsAnalyzing(false);
  };

  const generateOptimizedQuery = (originalQuery: string): string => {
    // Simple optimization transformations
    let optimized = originalQuery
      .replace(/SELECT \*/g, "SELECT id, name, email, created_at")
      .replace(/WHERE.*IN\s*\(/g, "WHERE EXISTS (")
      .replace(/LEFT JOIN/g, "JOIN");
    
    // Add index hint if applicable
    if (optimized.includes("JOIN")) {
      optimized = `-- Add index: CREATE INDEX idx_user_created ON users(user_id, created_at);\n${optimized}`;
    }
    
    return optimized;
  };

  const sampleQueries = [
    {
      name: "Slow JOIN Query",
      query: `SELECT * FROM orders o
LEFT JOIN users u ON o.user_id = u.id
WHERE o.created_at > '2024-01-01'
AND u.status IN ('active', 'premium')
ORDER BY o.created_at DESC
LIMIT 100;`
    },
    {
      name: "Inefficient Subquery",
      query: `SELECT * FROM products
WHERE category_id IN (
  SELECT id FROM categories 
  WHERE name LIKE '%electronics%'
)
AND price > 100;`
    },
    {
      name: "Complex Analytics",
      query: `SELECT u.name, COUNT(*) as order_count,
  AVG(o.total_amount) as avg_amount
FROM users u, orders o
WHERE u.id = o.user_id
AND o.created_at BETWEEN '2024-01-01' AND '2024-12-31'
GROUP BY u.id, u.name
HAVING COUNT(*) > 5;`
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-blue-600 text-white rounded-xl">
              <Zap className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              SQL Optimization Master
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Analyze, optimize, and boost your SQL query performance with AI-powered insights
          </p>
        </div>

        {/* Features Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">Performance</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Up to 90% faster execution
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-5 w-5 text-green-600" />
                <span className="font-semibold">Index Hints</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Smart indexing strategies
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-purple-200 dark:border-purple-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-purple-600" />
                <span className="font-semibold">Analysis</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Deep query insights
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-orange-200 dark:border-orange-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <span className="font-semibold">Real-time</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Instant optimization
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5" />
                SQL Query Input
              </CardTitle>
              <CardDescription>
                Paste your SQL query below for optimization analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter your SQL query here..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-[300px] font-mono"
              />
              
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sample queries:
                </span>
                {sampleQueries.map((sample, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setQuery(sample.query)}
                  >
                    {sample.name}
                  </Button>
                ))}
              </div>
              
              <Button 
                onClick={analyzeQuery}
                disabled={!query.trim() || isAnalyzing}
                className="w-full"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Analyzing Query...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Optimize Query
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Optimization Results
              </CardTitle>
              <CardDescription>
                Performance analysis and optimization suggestions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Run an analysis to see optimization results</p>
                </div>
              ) : (
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="optimized">Optimized</TabsTrigger>
                    <TabsTrigger value="issues">Issues</TabsTrigger>
                    <TabsTrigger value="plan">Execution</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-semibold">Performance Improvement:</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {result.performanceGain}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                          Issues Found
                        </div>
                        <div className="text-2xl font-bold text-red-600">
                          {result.issues.length}
                        </div>
                      </div>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                          Suggestions
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          {result.suggestions.length}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="optimized" className="space-y-4">
                    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-100 overflow-auto max-h-80">
                      <pre>{result.optimizedQuery}</pre>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="issues" className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          Issues Detected
                        </h4>
                        <ul className="space-y-2">
                          {result.issues.map((issue, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <div className="w-2 h-2 bg-red-500 rounded-full mt-2" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-blue-500" />
                          Optimization Suggestions
                        </h4>
                        <ul className="space-y-2">
                          {result.suggestions.map((suggestion, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="plan" className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Before Optimization</h4>
                      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg font-mono text-sm">
                        {result.executionPlan.before}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">After Optimization</h4>
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg font-mono text-sm">
                        {result.executionPlan.after}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}