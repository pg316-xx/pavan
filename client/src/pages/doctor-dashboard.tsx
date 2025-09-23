import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { 
  PawPrint, 
  Heart, 
  AlertTriangle, 
  MessageSquarePlus, 
  LogOut, 
  Filter,
  Send
} from "lucide-react";

interface SubmissionWithUser {
  submissions: {
    id: number;
    date: string;
    status: string;
    createdAt: string;
    structuredData?: any;
  };
  users: {
    id: string;
    name: string;
    userId: string;
  };
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const logout = useLogout();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [comments, setComments] = useState<{ [key: number]: string }>({});

  const { data: submissions = [], isLoading: submissionsLoading } = useQuery<SubmissionWithUser[]>({
    queryKey: ["/api/submissions/all"],
    staleTime: 30 * 1000, // 30 seconds
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ submissionId, content }: { submissionId: number; content: string }) => {
      const response = await apiRequest("POST", `/api/submissions/${submissionId}/comments`, { content });
      return response.json();
    },
    onSuccess: (_, variables) => {
      setComments(prev => ({ ...prev, [variables.submissionId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["/api/submissions/all"] });
      toast({
        title: "Medical Comment Added",
        description: "Your medical review has been saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Comment",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleAddComment = (submissionId: number) => {
    const comment = comments[submissionId];
    if (!comment?.trim()) {
      toast({
        title: "Comment Required",
        description: "Please enter your medical review",
        variant: "destructive",
      });
      return;
    }

    addCommentMutation.mutate({ submissionId, content: comment });
  };

  const updateComment = (submissionId: number, value: string) => {
    setComments(prev => ({ ...prev, [submissionId]: value }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPriorityLevel = (structuredData: any) => {
    if (!structuredData) return "normal";
    
    // Determine priority based on health indicators
    const hasAbnormalBehavior = !structuredData.normal_behaviour_status;
    const hasHealthIssues = structuredData.normal_behaviour_details?.toLowerCase().includes("sick") ||
                           structuredData.normal_behaviour_details?.toLowerCase().includes("ill") ||
                           structuredData.daily_animal_health_monitoring?.toLowerCase().includes("urgent");
    
    if (hasAbnormalBehavior || hasHealthIssues) return "high";
    return "normal";
  };

  // Calculate stats
  const totalReports = submissions.length;
  const reviewsNeeded = submissions.filter(s => 
    getPriorityLevel(s.submissions.structuredData) === "high"
  ).length;

  // Filter submissions
  const filteredSubmissions = selectedFilter === "all" 
    ? submissions 
    : submissions.filter(s => getPriorityLevel(s.submissions.structuredData) === selectedFilter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <header className="bg-white shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <PawPrint className="text-2xl text-primary" />
              <h1 className="text-xl font-bold text-foreground">Zoo Management System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground" data-testid="text-current-user">
                {user?.name || "Doctor"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => logout.mutate()}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Doctor Dashboard</h2>
          <p className="text-muted-foreground">Review animal health reports and provide medical insights</p>
        </div>

        {/* Health Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Health Reports</p>
                  <p className="text-2xl font-bold text-card-foreground" data-testid="stat-total-reports">
                    {totalReports}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Heart className="text-primary text-xl" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-muted-foreground">This month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Medical Reviews Needed</p>
                  <p className="text-2xl font-bold text-card-foreground" data-testid="stat-reviews-needed">
                    {reviewsNeeded}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="text-orange-500 text-xl" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-orange-600 font-medium">Requires attention</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Comments Added</p>
                  <p className="text-2xl font-bold text-card-foreground">23</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <MessageSquarePlus className="text-primary text-xl" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-muted-foreground">Last 7 days</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Health Reports */}
        <Card className="shadow-lg border border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Health Reports for Review</CardTitle>
              <div className="flex items-center space-x-3">
                <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                  <SelectTrigger className="w-48" data-testid="select-priority-filter">
                    <SelectValue placeholder="Filter by priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reports</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" data-testid="button-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {submissionsLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading health reports...</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No health reports found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSubmissions.map((item) => {
                  const priority = getPriorityLevel(item.submissions.structuredData);
                  const structuredData = item.submissions.structuredData || {};
                  
                  return (
                    <div
                      key={item.submissions.id}
                      className="p-4 border border-border rounded-lg hover:shadow-md transition-all"
                      data-testid={`health-report-${item.submissions.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h4 className="font-semibold text-card-foreground">
                              {formatDate(item.submissions.date)}
                            </h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              priority === "high" 
                                ? "bg-orange-100 text-orange-600" 
                                : "bg-green-100 text-green-600"
                            }`}>
                              {priority === "high" ? "High Priority" : "Normal"}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Reported by: {item.users.name}
                            </span>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Animal Behavior</p>
                              <p className="text-sm text-card-foreground">
                                {structuredData.normal_behaviour_status 
                                  ? "Normal behavior observed" 
                                  : structuredData.normal_behaviour_details || "Abnormal behavior noted"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Feeding Status</p>
                              <p className="text-sm text-card-foreground">
                                {structuredData.feed_given_as_prescribed 
                                  ? "Feed given as prescribed" 
                                  : "Feeding issues noted"}
                                {structuredData.clean_drinking_water_provided 
                                  ? ", water available" 
                                  : ", water shortage"}
                              </p>
                            </div>
                          </div>

                          <div className="mb-4">
                            <p className="text-sm text-muted-foreground mb-1">Health Monitoring Summary</p>
                            <p className="text-sm text-card-foreground">
                              {structuredData.daily_animal_health_monitoring || 
                               "No detailed health monitoring data available"}
                            </p>
                          </div>

                          {structuredData.other_animal_requirements && (
                            <div className="mb-4">
                              <p className="text-sm text-muted-foreground mb-1">Special Requirements</p>
                              <p className="text-sm text-card-foreground">
                                {structuredData.other_animal_requirements}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Add Medical Comment Section */}
                      <div className="border-t border-border pt-4">
                        <div className="flex space-x-3">
                          <div className="flex-1">
                            <Textarea
                              placeholder="Add your medical comments and recommendations..."
                              value={comments[item.submissions.id] || ""}
                              onChange={(e) => updateComment(item.submissions.id, e.target.value)}
                              className="resize-none"
                              rows={3}
                              data-testid={`textarea-medical-comment-${item.submissions.id}`}
                            />
                          </div>
                          <Button
                            onClick={() => handleAddComment(item.submissions.id)}
                            disabled={addCommentMutation.isPending}
                            className="whitespace-nowrap"
                            data-testid={`button-add-medical-comment-${item.submissions.id}`}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {addCommentMutation.isPending ? "Adding..." : "Add Comment"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
