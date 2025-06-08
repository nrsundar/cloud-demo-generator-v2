import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  ArrowLeft, 
  MessageSquare, 
  Clock, 
  Users, 
  CheckCircle,
  Lightbulb,
  Rocket,
  Target
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function DemoRequestPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    demoType: "",
    priority: "",
    message: ""
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          status: 'pending'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit request');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Demo Request Submitted",
        description: "We'll contact you within 24 hours to schedule your custom demonstration.",
        variant: "default"
      });
      setFormData({ email: "", demoType: "", priority: "", message: "" });
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: "Please try again or contact support directly.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.demoType || !formData.priority || !formData.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    submitMutation.mutate(formData);
  };

  const demoTypes = [
    { value: "customer-presentation", label: "Customer Presentation", icon: Users },
    { value: "technical-deep-dive", label: "Technical Deep Dive", icon: Target },
    { value: "proof-of-concept", label: "Proof of Concept", icon: Lightbulb },
    { value: "custom-use-case", label: "Custom Use Case", icon: Rocket }
  ];

  const priorityLevels = [
    { value: "urgent", label: "Urgent (24 hours)", color: "bg-red-100 text-red-800" },
    { value: "high", label: "High (2-3 days)", color: "bg-orange-100 text-orange-800" },
    { value: "normal", label: "Normal (1 week)", color: "bg-blue-100 text-blue-800" },
    { value: "low", label: "Low (2+ weeks)", color: "bg-gray-100 text-gray-800" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Generator</span>
            </Button>
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">Custom Demo Request</h1>
            </div>
            <div className="w-32"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Rocket className="h-5 w-5 text-blue-600" />
                  <span>Request Custom Demonstration</span>
                </CardTitle>
                <p className="text-gray-600">
                  Need a specialized database demonstration for your customer or use case? 
                  Our team will create a tailored repository and schedule a live demo session.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Contact Information */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Contact Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  {/* Demo Type */}
                  <div className="space-y-2">
                    <Label htmlFor="demoType">Demo Type *</Label>
                    <Select onValueChange={(value) => setFormData({ ...formData, demoType: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select demo type" />
                      </SelectTrigger>
                      <SelectContent>
                        {demoTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center space-x-2">
                              <type.icon className="h-4 w-4" />
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Priority */}
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority Level *</Label>
                    <Select onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4" />
                              <span>{level.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Requirements */}
                  <div className="space-y-2">
                    <Label htmlFor="message">Demo Requirements *</Label>
                    <Textarea
                      id="message"
                      placeholder="Describe your specific requirements:
• Customer industry and use case
• Technical requirements (database type, region, etc.)
• Audience size and technical level
• Key features to highlight
• Timeline and deadlines"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={8}
                      required
                    />
                  </div>

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={submitMutation.isPending}
                  >
                    {submitMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting Request...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Submit Demo Request
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Information */}
          <div className="space-y-6">
            {/* Response Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Clock className="h-5 w-5 text-green-600" />
                  <span>Response Time</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Badge className="bg-red-100 text-red-800">Urgent</Badge>
                  <span className="text-sm">24 hours</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-orange-100 text-orange-800">High</Badge>
                  <span className="text-sm">2-3 days</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-blue-100 text-blue-800">Normal</Badge>
                  <span className="text-sm">1 week</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-gray-100 text-gray-800">Low</Badge>
                  <span className="text-sm">2+ weeks</span>
                </div>
              </CardContent>
            </Card>

            {/* What We Provide */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <span>What We Provide</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Custom repository generation</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Live demo session</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Technical documentation</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Customer presentation materials</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Follow-up support</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                  <span>Need Help?</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Have questions about the demo request process or need immediate assistance?
                </p>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Email:</span> se-support@company.com
                  </div>
                  <div>
                    <span className="font-medium">Slack:</span> #database-demos
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}