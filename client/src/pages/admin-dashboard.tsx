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
  FileText, 
  Clock, 
  Users, 
  Heart, 
  LogOut, 
  Eye, 
  MessageSquare, 
  Download,
  ArrowUp,
  ArrowDown,
  Check,
  Filter
} from "lucide-react";
import ObservationDetailModal from "@/components/observation-detail-modal";

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

export default function AdminDashboard() {
  const { user } = useAuth();
  const logout = useLogout();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedKeeper, setSelectedKeeper] = useState<string>("all");
  const [newComment, setNewComment] = useState<string>("");
  const [commentingOn, setCommentingOn] = useState<number | null>(null);

  const { data: submissions = [], isLoading: submissionsLoading } = useQuery<SubmissionWithUser[]>({
    queryKey: ["/api/submissions/all"],
    staleTime: 30 * 1000, // 30 seconds
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ submissionId, content }: { submissionId: number; content: string }) => {
      const response = await apiRequest("POST", `/api/submissions/${submissionId}/comments`, { content });
      return response.json();
    },
    onSuccess: () => {
      setNewComment("");
      setCommentingOn(null);
      queryClient.invalidateQueries({ queryKey: ["/api/submissions/all"] });
      toast({
        title: "Comment Added",
        description: "Your comment has been added successfully",
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
    if (!newComment.trim()) {
      toast({
        title: "Comment Required",
        description: "Please enter a comment",
        variant: "destructive",
      });
      return;
    }

    addCommentMutation.mutate({ submissionId, content: newComment });
  };

  const handleDownloadReport = async (submissionId: number) => {
    try {
      const response = await fetch(`/api/submissions/${submissionId}/download`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to download report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `report_${submissionId}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: "Report is being downloaded",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the report",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate stats
  const totalSubmissions = submissions.length;
  const pendingReviews = submissions.filter(s => s.submissions?.status === "processing").length;
  const activeKeepers = Array.from(new Set(submissions.map(s => s.users?.id).filter(Boolean))).length;

  // Filter submissions by keeper
  const filteredSubmissions = selectedKeeper === "all" 
    ? submissions 
    : submissions.filter(s => s.users?.id === selectedKeeper);

  // Get unique keepers for filter
  const uniqueKeepers = Array.from(new Set(submissions.map(s => s.users?.id).filter(Boolean))).map(id => {
    const submission = submissions.find(s => s.users?.id === id);
    return { id, name: submission?.users?.name || '' };
  });

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
                {user?.name || "Admin"}
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
          <h2 className="text-2xl font-bold text-foreground mb-2">Admin Dashboard</h2>
          <p className="text-muted-foreground">Manage zoo operations and review all submissions</p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Submissions</p>
                  <p className="text-2xl font-bold text-card-foreground" data-testid="stat-total-submissions">
                    {totalSubmissions}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="text-primary text-xl" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <ArrowUp className="text-primary mr-1" size={16} />
                <span className="text-primary font-medium">12%</span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pending Reviews</p>
                  <p className="text-2xl font-bold text-card-foreground" data-testid="stat-pending-reviews">
                    {pendingReviews}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="text-orange-500 text-xl" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <ArrowDown className="text-red-500 mr-1" size={16} />
                <span className="text-red-500 font-medium">5%</span>
                <span className="text-muted-foreground ml-1">vs last week</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Active Keepers</p>
                  <p className="text-2xl font-bold text-card-foreground" data-testid="stat-active-keepers">
                    {activeKeepers}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="text-primary text-xl" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <Check className="text-primary mr-1" size={16} />
                <span className="text-primary font-medium">All active</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">System Health</p>
                  <p className="text-2xl font-bold text-card-foreground">98.5%</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Heart className="text-primary text-xl" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <Check className="text-primary mr-1" size={16} />
                <span className="text-primary font-medium">Excellent</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submissions Table */}
        <Card className="shadow-lg border border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Submissions</CardTitle>
              <div className="flex items-center space-x-3">
                <Select value={selectedKeeper} onValueChange={setSelectedKeeper}>
                  <SelectTrigger className="w-48" data-testid="select-keeper-filter">
                    <SelectValue placeholder="Filter by keeper" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Keepers</SelectItem>
                    {uniqueKeepers.map((keeper) => (
                      <SelectItem key={keeper.id} value={keeper.id}>
                        {keeper.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" data-testid="button-export">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {submissionsLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading submissions...</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No submissions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Keeper</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.filter(item => item.submissions && item.users).map((item) => (
                      <tr 
                        key={item.submissions.id} 
                        className="border-b border-border hover:bg-secondary/30 transition-colors"
                        data-testid={`submission-row-${item.submissions.id}`}
                      >
                        <td className="py-4 px-4 text-card-foreground">
                          {formatDate(item.submissions.date)}
                        </td>
                        <td className="py-4 px-4 text-card-foreground">
                          {item.users.name}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            item.submissions.status === "processed" 
                              ? "bg-primary/20 text-primary" 
                              : "bg-orange-100 text-orange-600"
                          }`}>
                            {item.submissions.status === "processed" ? "Processed" : "Pending Review"}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <ObservationDetailModal 
                              submissionId={item.submissions.id}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`button-view-${item.submissions.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCommentingOn(
                                commentingOn === item.submissions.id ? null : item.submissions.id
                              )}
                              data-testid={`button-comment-${item.submissions.id}`}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadReport(item.submissions.id)}
                              data-testid={`button-download-${item.submissions.id}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {commentingOn === item.submissions.id && (
                            <div className="mt-3 p-3 bg-secondary/30 rounded-lg">
                              <Textarea
                                placeholder="Add your comment..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="mb-2"
                                rows={2}
                                data-testid={`textarea-comment-${item.submissions.id}`}
                              />
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleAddComment(item.submissions.id)}
                                  disabled={addCommentMutation.isPending}
                                  data-testid={`button-submit-comment-${item.submissions.id}`}
                                >
                                  {addCommentMutation.isPending ? "Adding..." : "Add Comment"}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setCommentingOn(null);
                                    setNewComment("");
                                  }}
                                  data-testid={`button-cancel-comment-${item.submissions.id}`}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
