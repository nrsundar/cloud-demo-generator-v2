import React from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Grid, List, Search, Tabs, Filter } from "lucide-react";

export default function DesignDemo() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Scalable UI Design Options
          </h1>
          <p className="text-xl text-gray-600">
            Multiple approaches to organize use cases as your application grows
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Option 1: Tabbed Interface */}
          <Card className="border-blue-200">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Tabs className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Tabbed Categories</CardTitle>
              </div>
              <CardDescription>
                Organized tabs for Production Ready, High Availability, and Coming Soon use cases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm space-y-2">
                  <div className="font-medium text-green-700">✓ Pros:</div>
                  <ul className="text-gray-600 space-y-1 text-xs">
                    <li>• Clear categorization</li>
                    <li>• Reduced visual clutter</li>
                    <li>• Easy navigation</li>
                    <li>• Scales to 10+ categories</li>
                  </ul>
                  
                  <div className="font-medium text-orange-700 mt-3">⚠ Considerations:</div>
                  <ul className="text-gray-600 space-y-1 text-xs">
                    <li>• Hidden content in tabs</li>
                    <li>• Extra click to switch</li>
                  </ul>
                </div>
                
                <Button asChild className="w-full">
                  <Link href="/demo/scalable">
                    View Demo <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Option 2: Gallery with Filters */}
          <Card className="border-purple-200">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Grid className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-xl">Filterable Gallery</CardTitle>
              </div>
              <CardDescription>
                Grid layout with advanced search and filtering capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm space-y-2">
                  <div className="font-medium text-green-700">✓ Pros:</div>
                  <ul className="text-gray-600 space-y-1 text-xs">
                    <li>• All content visible</li>
                    <li>• Powerful filtering</li>
                    <li>• Search functionality</li>
                    <li>• Scales to 50+ items</li>
                  </ul>
                  
                  <div className="font-medium text-orange-700 mt-3">⚠ Considerations:</div>
                  <ul className="text-gray-600 space-y-1 text-xs">
                    <li>• Can feel overwhelming</li>
                    <li>• Requires good filtering</li>
                  </ul>
                </div>
                
                <Button asChild className="w-full">
                  <Link href="/demo/gallery">
                    View Demo <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Option 3: Multi-Layout Hybrid */}
          <Card className="border-green-200">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <List className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-xl">Hybrid Approach</CardTitle>
              </div>
              <CardDescription>
                Combines multiple layouts: featured cards, compact lists, and detailed views
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm space-y-2">
                  <div className="font-medium text-green-700">✓ Pros:</div>
                  <ul className="text-gray-600 space-y-1 text-xs">
                    <li>• Best of all approaches</li>
                    <li>• Progressive disclosure</li>
                    <li>• Highlights popular items</li>
                    <li>• Multiple view modes</li>
                  </ul>
                  
                  <div className="font-medium text-orange-700 mt-3">⚠ Considerations:</div>
                  <ul className="text-gray-600 space-y-1 text-xs">
                    <li>• More complex to build</li>
                    <li>• Needs careful design</li>
                  </ul>
                </div>
                
                <Button asChild className="w-full">
                  <Link href="/demo/scalable">
                    View Demo <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Recommendations Section */}
        <div className="mt-16 bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recommendations by Scale</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">5-15</div>
              <div className="text-sm text-gray-600 mb-3">Use Cases</div>
              <div className="text-sm">
                <strong>Recommended:</strong> Tabbed Interface
                <br />
                Clean organization without overwhelming users
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">15-50</div>
              <div className="text-sm text-gray-600 mb-3">Use Cases</div>
              <div className="text-sm">
                <strong>Recommended:</strong> Filterable Gallery
                <br />
                Search and filters become essential
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">50+</div>
              <div className="text-sm text-gray-600 mb-3">Use Cases</div>
              <div className="text-sm">
                <strong>Recommended:</strong> Hybrid Approach
                <br />
                Multiple access patterns and views
              </div>
            </div>
          </div>
        </div>

        {/* Current vs Future State */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Migration Path</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Current State (5 Use Cases)</h3>
              <div className="bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600 space-y-2">
                  <div>✓ Simple grid layout works well</div>
                  <div>✓ All content fits on one screen</div>
                  <div>✓ Easy to scan and compare</div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Future State (15+ Use Cases)</h3>
              <div className="bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600 space-y-2">
                  <div>→ Implement tabbed categorization</div>
                  <div>→ Add search functionality</div>
                  <div>→ Include popularity indicators</div>
                  <div>→ Progressive disclosure of details</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Main */}
        <div className="text-center mt-12">
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              ← Back to Main Application
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}