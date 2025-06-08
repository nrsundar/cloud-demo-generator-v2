import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Users, Download, TrendingUp, Activity, Database, Globe, Calendar, BarChart3, ChevronLeft, Search, Filter, Clock, User as UserIcon, FileText, MessageCircle } from "lucide-react";

interface AnalyticsStats {
  totalDownloads: number;
  uniqueUsers: number;
  topUseCases: Array<{ useCase: string; count: number }>;
  topLanguages: Array<{ language: string; count: number }>;
  recentDownloads: Array<{
    id: number;
    repositoryName: string;
    useCase: string;
    language: string;
    downloadedAt: string;
    userEmail?: string;
  }>;
}

interface Repository {
  id: number;
  name: string;
  language: string;
  databaseType: string;
  status: string;
  createdAt: string;
}

interface FeedbackRequest {
  id: number;
  email: string;
  demoType: string;
  message: string;
  priority: string;
  createdAt: string;
}

export default function AdminPage() {
  const { toast } = useToast();
  const { user, isAuthenticated, loading } = useFirebaseAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("overview");

  // Check if user is admin
  const isAdmin = user?.email === 'sroctank4@gmail.com';

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please sign in to access the admin dashboard.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, loading, toast]);

  // Show access denied for non-admin users
  if (!loading && isAuthenticated && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              You don't have permission to access the admin dashboard. This area is restricted to authorized administrators only.
            </p>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsStats>({
    queryKey: ["/api/analytics/stats"],
    retry: false,
    enabled: isAuthenticated && isAdmin,
  });

  const { data: repositories, isLoading: repositoriesLoading } = useQuery<Repository[]>({
    queryKey: ["/api/repositories"],
    retry: false,
    enabled: isAuthenticated && isAdmin,
  });

  const { data: signedInUsers, isLoading: usersLoading } = useQuery<Array<{ email: string; lastSeen: string; signInCount: number }>>({
    queryKey: ["/api/admin/users"],
    retry: false,
    enabled: isAuthenticated && isAdmin,
  });

  const { data: feedbackRequests, isLoading: feedbackLoading } = useQuery<FeedbackRequest[]>({
    queryKey: ["/api/admin/feedback"],
    retry: false,
    enabled: isAuthenticated && isAdmin,
  });

  if (loading || analyticsLoading || repositoriesLoading || usersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter functions
  const filteredDownloads = analytics?.recentDownloads?.filter(download =>
    download.repositoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    download.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    download.useCase.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredRepositories = repositories?.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repo.language.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repo.databaseType.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredUsers = signedInUsers?.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Cloud Database Generator analytics and user management
            </p>
          </div>
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="downloads">Downloads</TabsTrigger>
            <TabsTrigger value="repositories">Repositories</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.totalDownloads || 0}</div>
                  <p className="text-xs text-muted-foreground">Repository downloads</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.uniqueUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">Active users</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Generated Repos</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{repositories?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Total repositories created</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Feedback Requests</CardTitle>
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{feedbackRequests?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Demo requests received</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Popular Use Cases
                  </CardTitle>
                  <CardDescription>Most requested repository types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics?.topUseCases && analytics.topUseCases.length > 0 ? (
                      analytics.topUseCases.map((useCase, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{useCase.useCase}</span>
                          <Badge variant="secondary">{useCase.count}</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No use case data available yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Programming Languages
                  </CardTitle>
                  <CardDescription>Most popular language choices</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics?.topLanguages && analytics.topLanguages.length > 0 ? (
                      analytics.topLanguages.map((language, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{language.language}</span>
                          <Badge variant="secondary">{language.count}</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No language data available yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="downloads" className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search downloads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Download History ({filteredDownloads.length})
                </CardTitle>
                <CardDescription>Detailed download tracking with user information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredDownloads.length > 0 ? (
                    filteredDownloads.map((download) => (
                      <div key={download.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-blue-600">{download.repositoryName}</span>
                            <Badge variant="outline" className="text-xs">{download.language}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">{download.useCase}</span> • Downloaded by: {download.userEmail || 'Anonymous'}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(download.downloadedAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {searchTerm ? 'No downloads match your search' : 'No downloads recorded yet'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="repositories" className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search repositories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Generated Repositories ({filteredRepositories.length})
                </CardTitle>
                <CardDescription>All repositories created in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredRepositories.length > 0 ? (
                    filteredRepositories.map((repo) => (
                      <div key={repo.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{repo.name}</span>
                            <Badge variant="outline" className="text-xs">{repo.language}</Badge>
                            <Badge 
                              variant={repo.status === 'complete' ? 'default' : 
                                      repo.status === 'generating' ? 'secondary' : 'destructive'}
                              className="text-xs"
                            >
                              {repo.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{repo.databaseType} Database</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(repo.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {searchTerm ? 'No repositories match your search' : 'No repositories created yet'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Registered Users ({filteredUsers.length})
                </CardTitle>
                <CardDescription>Users who have signed into the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{user.email}</span>
                            {user.email === 'sroctank4@gmail.com' && (
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">Admin</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {user.signInCount} sign-ins • Last seen: {new Date(user.lastSeen).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {searchTerm ? 'No users match your search' : 'No users have signed in yet'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Demo Requests & Feedback ({feedbackRequests?.length || 0})
                </CardTitle>
                <CardDescription>User feedback and custom demo requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {feedbackRequests && feedbackRequests.length > 0 ? (
                    feedbackRequests.map((feedback) => (
                      <div key={feedback.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{feedback.email}</span>
                            <Badge variant="outline" className="text-xs">{feedback.demoType}</Badge>
                            <Badge 
                              variant={feedback.priority === 'high' ? 'destructive' : 
                                      feedback.priority === 'medium' ? 'secondary' : 'default'}
                              className="text-xs"
                            >
                              {feedback.priority} priority
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(feedback.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                          {feedback.message}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No feedback or demo requests received yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}