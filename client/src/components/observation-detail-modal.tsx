import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { Eye, Calendar, User, FileText, Activity, MapPin, Clock, Cloud } from "lucide-react";

interface ObservationDetailModalProps {
  submissionId: number;
  trigger?: React.ReactNode;
}

interface SubmissionDetail {
  id: number;
  date: string;
  audioFileName?: string;
  transcription?: string;
  structuredData?: {
    animals?: Array<{
      species?: string;
      name?: string;
      behavior?: string;
      health_status?: string;
      location?: string;
      notes?: string;
    }>;
    environment?: {
      weather?: string;
      temperature?: string;
      humidity?: string;
      notes?: string;
    };
    keeper_observations?: {
      general_notes?: string;
      concerns?: string;
      recommendations?: string;
    };
    timestamp?: string;
    observation_type?: string;
  };
  txtFileName?: string;
  status: string;
  createdAt: string;
  user?: {
    name: string;
    userId: string;
  };
}

export default function ObservationDetailModal({ submissionId, trigger }: ObservationDetailModalProps) {
  const [open, setOpen] = useState(false);

  const { data: submission, isLoading } = useQuery<SubmissionDetail>({
    queryKey: ["/api/submissions", submissionId],
    enabled: open,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

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

  const renderAnimalObservations = (animals: any[]) => {
    if (!animals || animals.length === 0) return null;

    return animals.map((animal, index) => (
      <Card key={index} className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Activity className="mr-2 h-5 w-5 text-primary" />
            {animal.species || "Animal"} {animal.name && `- ${animal.name}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {animal.behavior && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Behavior</h4>
              <p className="text-sm">{animal.behavior}</p>
            </div>
          )}
          {animal.health_status && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Health Status</h4>
              <Badge variant={animal.health_status.toLowerCase().includes('good') || animal.health_status.toLowerCase().includes('healthy') ? "default" : "secondary"}>
                {animal.health_status}
              </Badge>
            </div>
          )}
          {animal.location && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1 flex items-center">
                <MapPin className="mr-1 h-3 w-3" />
                Location
              </h4>
              <p className="text-sm">{animal.location}</p>
            </div>
          )}
          {animal.notes && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Notes</h4>
              <p className="text-sm">{animal.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    ));
  };

  const renderEnvironmentData = (environment: any) => {
    if (!environment || Object.keys(environment).length === 0) return null;

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Cloud className="mr-2 h-5 w-5 text-blue-500" />
            Environment Conditions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            {environment.weather && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Weather</h4>
                <p className="text-sm">{environment.weather}</p>
              </div>
            )}
            {environment.temperature && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Temperature</h4>
                <p className="text-sm">{environment.temperature}</p>
              </div>
            )}
            {environment.humidity && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Humidity</h4>
                <p className="text-sm">{environment.humidity}</p>
              </div>
            )}
          </div>
          {environment.notes && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Environment Notes</h4>
              <p className="text-sm">{environment.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderKeeperObservations = (keeperObs: any) => {
    if (!keeperObs || Object.keys(keeperObs).length === 0) return null;

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <User className="mr-2 h-5 w-5 text-green-500" />
            Keeper Observations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {keeperObs.general_notes && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">General Notes</h4>
              <p className="text-sm">{keeperObs.general_notes}</p>
            </div>
          )}
          {keeperObs.concerns && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Concerns</h4>
              <p className="text-sm text-amber-600">{keeperObs.concerns}</p>
            </div>
          )}
          {keeperObs.recommendations && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Recommendations</h4>
              <p className="text-sm text-blue-600">{keeperObs.recommendations}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" data-testid={`button-view-${submissionId}`}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Observation Details
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : submission ? (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Date</p>
                      <p className="text-muted-foreground">{formatDate(submission.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Time</p>
                      <p className="text-muted-foreground">{formatTime(submission.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Keeper</p>
                      <p className="text-muted-foreground">{submission.user?.name || "Unknown"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">Status</p>
                    <Badge variant={submission.status === "processed" ? "default" : "secondary"}>
                      {submission.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Structured Data */}
              {submission.structuredData && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Processed Observation Data</h3>
                  
                  {/* Animal Observations */}
                  {submission.structuredData.animals && (
                    <div className="mb-6">
                      <h4 className="text-lg font-medium mb-3">Animal Observations</h4>
                      {renderAnimalObservations(submission.structuredData.animals)}
                    </div>
                  )}

                  {/* Environment Data */}
                  {submission.structuredData.environment && (
                    <div className="mb-6">
                      <h4 className="text-lg font-medium mb-3">Environment</h4>
                      {renderEnvironmentData(submission.structuredData.environment)}
                    </div>
                  )}

                  {/* Keeper Observations */}
                  {submission.structuredData.keeper_observations && (
                    <div className="mb-6">
                      <h4 className="text-lg font-medium mb-3">Additional Observations</h4>
                      {renderKeeperObservations(submission.structuredData.keeper_observations)}
                    </div>
                  )}

                  {/* Observation Type */}
                  {submission.structuredData.observation_type && (
                    <div className="mb-4">
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Observation Type</h4>
                      <Badge variant="outline">{submission.structuredData.observation_type}</Badge>
                    </div>
                  )}
                </div>
              )}

              {/* Raw Transcription */}
              {submission.transcription && (
                <div>
                  <Separator className="my-4" />
                  <h4 className="text-lg font-medium mb-3">Original Transcription</h4>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {submission.transcription}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* No Data Message */}
              {!submission.structuredData && !submission.transcription && (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h4 className="text-lg font-medium mb-2">No Processed Data</h4>
                  <p className="text-muted-foreground">
                    This observation is still being processed or encountered an error.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Failed to load observation details.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

