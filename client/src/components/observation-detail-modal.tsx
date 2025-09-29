import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { Eye, ArrowLeft, User as UserIcon, Image, Play, Pause } from "lucide-react";

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
  const [isPlaying, setIsPlaying] = useState(false);

  const { data: submission, isLoading } = useQuery<SubmissionDetail>({
    queryKey: ["/api/submissions", submissionId],
    enabled: open,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Helper function to get field value from structured data
  const getFieldValue = (path: string): string => {
    if (!submission?.structuredData) return '';
    
    const pathParts = path.split('.');
    let current: any = submission.structuredData;
    
    for (const part of pathParts) {
      if (current && typeof current === 'object') {
        current = current[part];
      } else {
        return '';
      }
    }
    
    // Handle arrays (for animals)
    if (Array.isArray(current) && current.length > 0) {
      return current[0][pathParts[pathParts.length - 1]] || '';
    }
    
    return typeof current === 'string' ? current : '';
  };

  // Get animal data
  const animalData = submission?.structuredData?.animals?.[0] || {};
  
  const renderFormField = (label: string, value: string, placeholder?: string) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <Input
        value={value || ''}
        readOnly
        placeholder={placeholder}
        className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        data-testid={`field-${label.toLowerCase().replace(/\s+/g, '-')}`}
      />
    </div>
  );

  const renderTextareaField = (label: string, value: string) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <Textarea
        value={value || ''}
        readOnly
        className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 min-h-[80px]"
        data-testid={`field-${label.toLowerCase().replace(/\s+/g, '-')}`}
      />
    </div>
  );

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
      <DialogContent className="max-w-md max-h-[90vh] p-0 gap-0">
        {/* Header */}
        <div className="bg-green-600 text-white p-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-green-700 p-1 h-8 w-8"
              onClick={() => setOpen(false)}
              data-testid="button-close-observation"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Safari Record</h1>
          </div>
          <UserIcon className="h-6 w-6" />
        </div>

        <ScrollArea className="max-h-[calc(90vh-4rem)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : submission ? (
            <div className="p-4 space-y-6">
              {/* Details Section */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Details</h2>
                
                <div className="space-y-4">
                  {renderFormField("Species ?", animalData.species || '', "Enter species")}
                  {renderFormField("Name of the wild animal ?", animalData.name || '', "Enter animal name")}
                  {renderTextareaField("Animal behavior", animalData.behavior || '')}
                  {renderFormField("Health status", animalData.health_status || '', "Enter health status")}
                  {renderFormField("Location", animalData.location || '', "Enter location")}
                  {renderTextareaField("Additional notes", animalData.notes || '')}
                  {renderFormField("Weather conditions", getFieldValue('environment.weather'))}
                  {renderFormField("Temperature", getFieldValue('environment.temperature'))}
                  {renderFormField("Humidity", getFieldValue('environment.humidity'))}
                  {renderTextareaField("General observations", getFieldValue('keeper_observations.general_notes'))}
                  {renderTextareaField("Concerns", getFieldValue('keeper_observations.concerns'))}
                  {renderTextareaField("Recommendations", getFieldValue('keeper_observations.recommendations'))}
                </div>
              </div>

              {/* Images Section */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Images</h2>
                <Card className="p-4">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <Image className="h-8 w-8 text-gray-400" />
                    </div>
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled
                      data-testid="button-view-images"
                    >
                      <Image className="h-4 w-4 mr-2" />
                      View Images
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Audio Recording Section */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Audio Recording</h2>
                <Card className="p-4">
                  <div className="space-y-4">
                    {/* Audio timeline */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>00:00:00</span>
                        <span>00:00:00</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full w-0"></div>
                      </div>
                    </div>
                    
                    {/* Play button */}
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-16 h-16 rounded-full border-2 border-gray-300 dark:border-gray-600"
                        onClick={() => setIsPlaying(!isPlaying)}
                        data-testid="button-play-audio"
                      >
                        {isPlaying ? (
                          <Pause className="h-8 w-8" />
                        ) : (
                          <Play className="h-8 w-8 ml-1" />
                        )}
                      </Button>
                    </div>

                    {submission.audioFileName && (
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Audio file: {submission.audioFileName}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Original Transcription */}
              {submission.transcription && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Original Transcription</h2>
                  <Card className="p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {submission.transcription}
                    </p>
                  </Card>
                </div>
              )}

              {/* No Data Message */}
              {!submission.structuredData && !submission.transcription && (
                <div className="text-center py-8">
                  <Eye className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium mb-2">No Processed Data</h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    This observation is still being processed or encountered an error.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">Failed to load observation details.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

