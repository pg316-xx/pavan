import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PawPrint, Calendar, Mic, History, Edit, Eye, LogOut } from "lucide-react";
import CalendarCustom from "@/components/ui/calendar-custom";
import AudioRecorder from "@/components/audio-recorder";
import SuccessModal from "@/components/success-modal";

interface Submission {
  id: number;
  date: string;
  status: string;
  createdAt: string;
  structuredData?: any;
}

export default function ZookeeperDashboard() {
  const { user } = useAuth();
  const logout = useLogout();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSubmissionId, setLastSubmissionId] = useState<number | null>(null);

  const { data: submissions = [], isLoading: submissionsLoading } = useQuery<Submission[]>({
    queryKey: ["/api/submissions/my"],
    staleTime: 30 * 1000, // 30 seconds
  });

  const submitAudioMutation = useMutation({
    mutationFn: async ({ audioBlob, date }: { audioBlob: Blob; date: string }) => {
      const formData = new FormData();
      formData.append("audio", audioBlob, "observation.wav");
      formData.append("date", date);

      const response = await fetch("/api/submissions/audio", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to submit audio");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setLastSubmissionId(data.submissionId);
      setShowSuccessModal(true);
      queryClient.invalidateQueries({ queryKey: ["/api/submissions/my"] });
      toast({
        title: "Success",
        description: "Your observation has been processed successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to process audio observation",
        variant: "destructive",
      });
    },
  });

  const handleAudioSubmit = (audioBlob: Blob) => {
    if (!selectedDate) {
      toast({
        title: "Date Required",
        description: "Please select a date for your observation",
        variant: "destructive",
      });
      return;
    }

    submitAudioMutation.mutate({ audioBlob, date: selectedDate });
  };

  const handleEditSubmission = (submissionId: number) => {
    // TODO: Implement edit functionality
    toast({
      title: "Edit Feature",
      description: "Edit functionality will be available soon",
    });
  };

  const handleViewSubmission = (submissionId: number) => {
    // TODO: Implement view functionality
    toast({
      title: "View Feature",
      description: "View functionality will be available soon",
    });
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
                {user?.name || "Zoo Keeper"}
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
          <h2 className="text-2xl font-bold text-foreground mb-2">Zoo Keeper Dashboard</h2>
          <p className="text-muted-foreground">Record daily observations and submit audio reports</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Calendar Section */}
          <Card className="shadow-lg border border-border">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-3 text-primary" />
                Select Date for Observation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CalendarCustom
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
              {selectedDate && (
                <div className="mt-4 p-3 bg-accent/10 rounded-lg">
                  <p className="text-sm text-accent-foreground">
                    <span className="font-medium">Selected Date:</span> {formatDate(selectedDate)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audio Recording Section */}
          <Card className="shadow-lg border border-border">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mic className="mr-3 text-primary" />
                Record Observation (Hindi)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AudioRecorder
                onAudioSubmit={handleAudioSubmit}
                isSubmitting={submitAudioMutation.isPending}
                disabled={!selectedDate}
              />
            </CardContent>
          </Card>
        </div>

        {/* Recent Submissions */}
        <Card className="mt-8 shadow-lg border border-border">
          <CardHeader>
            <CardTitle className="flex items-center">
              <History className="mr-3 text-primary" />
              Recent Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submissionsLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading submissions...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No submissions yet. Record your first observation!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="submission-card p-4 bg-secondary/50 rounded-lg border border-border"
                    data-testid={`submission-${submission.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Mic className="text-primary" size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-card-foreground">{formatDate(submission.date)}</p>
                          <p className="text-sm text-muted-foreground">
                            Submitted at {formatTime(submission.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-medium">
                          {submission.status === "processed" ? "Processed" : "Processing"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditSubmission(submission.id)}
                          data-testid={`button-edit-${submission.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewSubmission(submission.id)}
                          data-testid={`button-view-${submission.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          onEdit={() => {
            if (lastSubmissionId) {
              handleEditSubmission(lastSubmissionId);
            }
            setShowSuccessModal(false);
          }}
        />
      </main>
    </div>
  );
}
