import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Code, Zap, ChevronDown, Database, Settings } from "lucide-react";
import { useLocation } from "wouter";

export default function ToolsDropdown() {
  const [, navigate] = useLocation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center space-x-1">
          <Code className="h-4 w-4" />
          <span className="hidden lg:inline">Tools</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Database Tools</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => navigate('/sql-optimizer')}>
          <Zap className="mr-2 h-4 w-4" />
          SQL Optimizer
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Database className="mr-2 h-4 w-4" />
          Schema Designer
          <span className="ml-auto text-xs text-gray-400">Soon</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Migration Tools</DropdownMenuLabel>
        <DropdownMenuItem disabled>
          <Settings className="mr-2 h-4 w-4" />
          SQL Converter
          <span className="ml-auto text-xs text-gray-400">Soon</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}