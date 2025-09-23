import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Mic, Square, Upload, Trash2, Play, Pause } from "lucide-react";

interface AudioRecorderProps {
  onAudioSubmit: (audioBlob: Blob) => void;
  isSubmitting: boolean;
  disabled?: boolean;
}

export default function AudioRecorder({ onAudioSubmit, isSubmitting, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("audio/")) {
      setAudioBlob(file);
      setAudioUrl(URL.createObjectURL(file));
      toast({
        title: "Audio Uploaded",
        description: "Audio file has been uploaded successfully",
      });
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid audio file",
        variant: "destructive",
      });
    }
  };

  const clearAudio = () => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setIsPlaying(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSubmit = () => {
    if (audioBlob) {
      onAudioSubmit(audioBlob);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Show upload area if no audio and not recording
  if (!audioBlob && !isRecording) {
    return (
      <div className="space-y-6">
        <div 
          className="text-center py-8 border-2 border-dashed border-border rounded-lg hover:border-primary/50 transition-colors"
          data-testid="audio-upload-area"
        >
          <div className="mb-4">
            <Mic className="text-4xl text-muted-foreground mx-auto" size={64} />
          </div>
          <p className="text-muted-foreground mb-4">Record or upload your daily observation in Hindi</p>
          <div className="space-y-3">
            <Button
              onClick={startRecording}
              disabled={disabled}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-start-recording"
            >
              <Mic className="h-4 w-4 mr-2" />
              Start Recording
            </Button>
            <div className="text-muted-foreground text-sm">or</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
              data-testid="input-audio-file"
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              data-testid="button-upload-audio"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Audio File
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show recording status
  if (isRecording) {
    const progress = Math.min((recordingTime / 120) * 100, 100); // Max 2 minutes

    return (
      <div className="space-y-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg" data-testid="recording-status">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full recording-pulse mr-3"></div>
              <span className="text-red-700 font-medium">
                Recording... {formatTime(recordingTime)}
              </span>
            </div>
            <Button
              onClick={stopRecording}
              className="bg-red-500 text-white hover:bg-red-600"
              size="sm"
              data-testid="button-stop-recording"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          </div>
          <Progress value={progress} className="w-full" />
          {recordingTime >= 120 && (
            <p className="text-red-600 text-sm mt-2">Maximum recording time reached</p>
          )}
        </div>
      </div>
    );
  }

  // Show audio preview and controls
  return (
    <div className="space-y-6">
      <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg" data-testid="audio-preview">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-accent-foreground flex items-center">
            <Mic className="h-4 w-4 mr-2" />
            Audio Ready
          </span>
          <span className="text-sm text-muted-foreground">
            Duration: {audioUrl && (
              <audio
                ref={audioRef}
                src={audioUrl}
                onLoadedMetadata={() => {
                  if (audioRef.current) {
                    const duration = Math.floor(audioRef.current.duration);
                    const mins = Math.floor(duration / 60);
                    const secs = duration % 60;
                    // Update duration display if needed
                  }
                }}
                onEnded={() => setIsPlaying(false)}
                style={{ display: "none" }}
              />
            )}
          </span>
        </div>
        
        {audioUrl && (
          <div className="mb-3">
            <div className="flex items-center space-x-3 mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={togglePlayback}
                data-testid="button-toggle-playback"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="flex-1 bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: "0%" }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex space-x-3">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !audioBlob}
            className="flex-1"
            data-testid="button-submit-observation"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Submit Observation
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={clearAudio}
            disabled={isSubmitting}
            data-testid="button-clear-audio"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>
      
      {isSubmitting && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg" data-testid="processing-status">
          <div className="flex items-center">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
            <span className="text-blue-700 font-medium">
              Processing audio and generating structured data...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
