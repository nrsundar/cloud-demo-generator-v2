import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DatasetInfo } from "@shared/schema";

interface DatasetsPreviewProps {
  repositoryId: number;
}

export default function DatasetsPreview({ repositoryId }: DatasetsPreviewProps) {
  const { data: datasets = [] } = useQuery<DatasetInfo[]>({
    queryKey: ["/api/repositories", repositoryId, "datasets"],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return <Badge className="bg-accent text-white"><i className="fas fa-check mr-1"></i>Generated</Badge>;
      case "processing":
        return <Badge className="bg-yellow-500 text-white"><i className="fas fa-clock mr-1"></i>Processing</Badge>;
      case "queued":
        return <Badge variant="secondary"><i className="fas fa-hourglass-half mr-1"></i>Queued</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const sampleData = `{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": 1,
        "name": "Broadway",
        "type": "primary",
        "oneway": false,
        "speed_limit": 25
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [-73.9857, 40.7484],
          [-73.9847, 40.7494],
          [-73.9837, 40.7504]
        ]
      }
    }
  ]
}`;

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {datasets.map((dataset) => (
          <Card key={dataset.name} className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center mb-3">
                <i className={`${dataset.icon} text-${dataset.color} text-xl mr-3`}></i>
                <div>
                  <CardTitle className="text-base">{dataset.name}</CardTitle>
                  <p className="text-sm text-gray-600">{dataset.description}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Format:</span>
                  <span className="font-medium">{dataset.format}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Size:</span>
                  <span className="font-medium">{dataset.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Features:</span>
                  <span className="font-medium">{dataset.features}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                {getStatusBadge(dataset.status)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Data Preview */}
      <div>
        <CardTitle className="text-lg mb-4">Sample Data Preview</CardTitle>
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="mb-2 text-gray-600 font-mono text-sm">
              // NYC Road Network Sample (GeoJSON)
            </div>
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-100 overflow-auto max-h-64">
              <pre><code>{sampleData}</code></pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
