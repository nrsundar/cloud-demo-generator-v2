import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import type { Property, PropertySearchParams } from "@shared/schema";

export default function PropertySearch() {
  const [searchParams, setSearchParams] = useState<PropertySearchParams>({
    propertyId: 1001,
    radiusMeters: 1000,
    maxResults: 20
  });

  const [searchStartTime, setSearchStartTime] = useState<number | null>(null);

  const searchMutation = useMutation({
    mutationFn: async (params: PropertySearchParams) => {
      setSearchStartTime(Date.now());
      const queryParams = new URLSearchParams({
        propertyId: params.propertyId.toString(),
        radiusMeters: params.radiusMeters.toString(),
        maxResults: params.maxResults?.toString() || "50",
        ...(params.priceMin && { priceMin: params.priceMin.toString() }),
        ...(params.priceMax && { priceMax: params.priceMax.toString() }),
        ...(params.propertyType && { propertyType: params.propertyType })
      });
      
      const response = await apiRequest("GET", `/api/properties/search?${queryParams}`);
      return response.json();
    }
  });

  const handleSearch = () => {
    searchMutation.mutate(searchParams);
  };

  const searchLatency = searchStartTime && searchMutation.isSuccess 
    ? Date.now() - searchStartTime 
    : null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Educational Notice */}
      <div className="bg-yellow-50 border-b border-yellow-200 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center">
            <i className="fas fa-exclamation-triangle text-yellow-600 mr-3"></i>
            <div className="text-sm">
              <span className="font-semibold text-yellow-800">Educational Purpose Only:</span>
              <span className="text-yellow-700 ml-2">
                This application is designed for learning PostGIS and pg_route spatial indexing techniques. 
                Property data is simulated for demonstration purposes.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 rounded-lg p-2">
                <i className="fas fa-search-location text-white text-xl"></i>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">PropScope</h1>
                <p className="text-sm text-gray-600">High-Performance Property Search</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-1">
                <i className="fas fa-database text-blue-600 text-sm"></i>
                <span className="text-sm font-medium">38GB Dataset</span>
              </div>
              {searchLatency && (
                <div className="flex items-center space-x-2 bg-green-100 rounded-lg px-3 py-1">
                  <i className="fas fa-stopwatch text-green-600 text-sm"></i>
                  <span className="text-sm font-medium text-green-800">{searchLatency}ms</span>
                </div>
              )}
              <Link href="/">
                <Button variant="outline">
                  <i className="fas fa-arrow-left mr-2"></i>
                  Back to Generator
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Search Controls */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-sliders-h text-blue-600 mr-2"></i>
                  Search Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property ID
                  </label>
                  <Input
                    type="number"
                    value={searchParams.propertyId}
                    onChange={(e) => setSearchParams(prev => ({
                      ...prev,
                      propertyId: parseInt(e.target.value) || 1001
                    }))}
                    placeholder="Enter property ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Radius (meters)
                  </label>
                  <Select
                    value={searchParams.radiusMeters.toString()}
                    onValueChange={(value) => setSearchParams(prev => ({
                      ...prev,
                      radiusMeters: parseInt(value)
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="500">500m</SelectItem>
                      <SelectItem value="1000">1km</SelectItem>
                      <SelectItem value="2000">2km</SelectItem>
                      <SelectItem value="5000">5km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Results
                  </label>
                  <Select
                    value={searchParams.maxResults?.toString() || "20"}
                    onValueChange={(value) => setSearchParams(prev => ({
                      ...prev,
                      maxResults: parseInt(value)
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Type
                  </label>
                  <Select
                    value={searchParams.propertyType || "all"}
                    onValueChange={(value) => setSearchParams(prev => ({
                      ...prev,
                      propertyType: value === "all" ? undefined : value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Single Family">Single Family</SelectItem>
                      <SelectItem value="Condo">Condo</SelectItem>
                      <SelectItem value="Townhouse">Townhouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Price
                    </label>
                    <Input
                      type="number"
                      value={searchParams.priceMin || ""}
                      onChange={(e) => setSearchParams(prev => ({
                        ...prev,
                        priceMin: e.target.value ? parseInt(e.target.value) : undefined
                      }))}
                      placeholder="Any"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Price
                    </label>
                    <Input
                      type="number"
                      value={searchParams.priceMax || ""}
                      onChange={(e) => setSearchParams(prev => ({
                        ...prev,
                        priceMax: e.target.value ? parseInt(e.target.value) : undefined
                      }))}
                      placeholder="Any"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSearch}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                  disabled={searchMutation.isPending}
                >
                  {searchMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Searching...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-search mr-2"></i>
                      Search Properties
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {searchMutation.isSuccess && (
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Search Results ({searchMutation.data?.length || 0} properties)
                  </h2>
                  {searchLatency && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <i className="fas fa-clock"></i>
                      <span>Query executed in {searchLatency}ms</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {searchMutation.isSuccess && searchMutation.data && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {searchMutation.data.map((property: Property) => (
                  <Card key={property.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {formatPrice(property.price)}
                            </h3>
                            <Badge 
                              className={`ml-2 ${
                                property.listingStatus === 'Active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {property.listingStatus}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{property.address}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{property.bedrooms}</div>
                          <div className="text-gray-600">Beds</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{property.bathrooms}</div>
                          <div className="text-gray-600">Baths</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{property.squareFeet.toLocaleString()}</div>
                          <div className="text-gray-600">Sq Ft</div>
                        </div>
                      </div>

                      <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Property Type:</span>
                          <span className="font-medium">{property.propertyType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Listed:</span>
                          <span className="font-medium">{formatDate(property.listingDate.toString())}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Property ID:</span>
                          <span className="font-mono text-xs">{property.id}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!searchMutation.isSuccess && !searchMutation.isPending && (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="mb-4">
                    <i className="fas fa-search text-gray-400 text-6xl mb-4"></i>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Ready to Search
                  </h3>
                  <p className="text-gray-600">
                    Configure your search parameters and click "Search Properties" to find nearby listings.
                    This demo showcases high-performance spatial queries using PostGIS indexing.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}