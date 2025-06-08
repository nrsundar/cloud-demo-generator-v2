import { Card, CardContent } from "@/components/ui/card";
import type { GeneratedFile } from "@shared/schema";

interface FileTreeProps {
  files: GeneratedFile[];
}

export default function FileTree({ files }: FileTreeProps) {
  const getFileIcon = (file: GeneratedFile) => {
    if (file.type === "folder") {
      return "fas fa-folder text-yellow-600";
    }
    
    switch (file.language) {
      case "markdown":
        return "fas fa-file-alt text-blue-500";
      case "sql":
        return "fas fa-database text-orange-500";
      case "python":
        return "fas fa-file-code text-green-500";
      case "javascript":
        return "fas fa-file-code text-yellow-500";
      case "java":
        return "fas fa-file-code text-red-500";
      case "yaml":
        return "fas fa-file-code text-purple-500";
      case "json":
        return "fas fa-file text-blue-600";
      case "csv":
        return "fas fa-file-csv text-green-600";
      case "dockerfile":
        return "fas fa-file-code text-blue-400";
      default:
        return "fas fa-file text-gray-500";
    }
  };

  const formatFileSize = (size?: number) => {
    if (!size) return "";
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`;
    return `${Math.round(size / (1024 * 1024))}MB`;
  };

  const renderFiles = (files: GeneratedFile[], level = 0) => {
    const sortedFiles = [...files].sort((a, b) => {
      // Folders first, then files
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return a.path.localeCompare(b.path);
    });

    return (
      <div className="space-y-1">
        {sortedFiles.map((file, index) => (
          <div
            key={index}
            className={`flex items-center text-gray-700 py-1 ${
              level > 0 ? `ml-${level * 4}` : ""
            }`}
          >
            <i className={`${getFileIcon(file)} mr-2 text-sm`}></i>
            <span className="text-sm font-mono flex-1">
              {file.path.split("/").pop()}
            </span>
            {file.size && (
              <span className="text-xs text-gray-500 ml-2">
                {formatFileSize(file.size)}
              </span>
            )}
            {file.status === "complete" && (
              <i className="fas fa-check text-green-500 ml-2 text-xs"></i>
            )}
            {file.status === "generating" && (
              <i className="fas fa-spinner fa-spin text-yellow-500 ml-2 text-xs"></i>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="bg-gray-50">
      <CardContent className="p-4 font-mono text-sm overflow-auto max-h-96">
        {files.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <i className="fas fa-folder-open text-4xl mb-4"></i>
            <p>No files generated yet</p>
          </div>
        ) : (
          renderFiles(files)
        )}
      </CardContent>
    </Card>
  );
}
