/**
 * Audio utility functions for the zoo management system
 */

export interface AudioConstraints {
  maxDuration: number; // in seconds
  maxFileSize: number; // in bytes
  supportedFormats: string[];
}

export const DEFAULT_AUDIO_CONSTRAINTS: AudioConstraints = {
  maxDuration: 300, // 5 minutes
  maxFileSize: 50 * 1024 * 1024, // 50MB
  supportedFormats: ['audio/wav', 'audio/mp3', 'audio/m4a', 'audio/ogg'],
};

/**
 * Validates an audio file against the given constraints
 */
export function validateAudioFile(file: File, constraints = DEFAULT_AUDIO_CONSTRAINTS): { isValid: boolean; error?: string } {
  // Check file size
  if (file.size > constraints.maxFileSize) {
    return {
      isValid: false,
      error: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(constraints.maxFileSize / 1024 / 1024)}MB)`,
    };
  }

  // Check file format
  if (!constraints.supportedFormats.includes(file.type)) {
    return {
      isValid: false,
      error: `File format ${file.type} is not supported. Supported formats: ${constraints.supportedFormats.join(', ')}`,
    };
  }

  return { isValid: true };
}

/**
 * Gets the duration of an audio file
 */
export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    
    audio.onloadedmetadata = () => {
      window.URL.revokeObjectURL(audio.src);
      resolve(audio.duration);
    };
    
    audio.onerror = () => {
      window.URL.revokeObjectURL(audio.src);
      reject(new Error('Failed to load audio metadata'));
    };
    
    audio.src = URL.createObjectURL(file);
  });
}

/**
 * Converts audio blob to a specific format if needed
 */
export function convertAudioBlob(blob: Blob, targetType: string = 'audio/wav'): Blob {
  if (blob.type === targetType) {
    return blob;
  }
  
  // For now, return the original blob
  // In a production environment, you might want to use a library like FFmpeg.js
  // to convert between audio formats
  return blob;
}

/**
 * Formats duration in seconds to MM:SS format
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Creates a visual representation of audio levels (for recording UI)
 */
export class AudioVisualizer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationId: number | null = null;

  async initialize(stream: MediaStream): Promise<void> {
    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);
      
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    } catch (error) {
      console.error('Failed to initialize audio visualizer:', error);
      throw error;
    }
  }

  startVisualization(callback: (levels: number[]) => void): void {
    if (!this.analyser || !this.dataArray) return;

    const animate = () => {
      this.analyser!.getByteFrequencyData(this.dataArray!);
      
      // Convert to normalized levels (0-1)
      const levels = Array.from(this.dataArray!).map(value => value / 255);
      callback(levels);
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  stopVisualization(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  cleanup(): void {
    this.stopVisualization();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

/**
 * Records audio using MediaRecorder API
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async startRecording(constraints: MediaStreamConstraints = { audio: true }): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];

      return new Promise((resolve, reject) => {
        this.mediaRecorder!.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder!.onstart = () => {
          resolve();
        };

        this.mediaRecorder!.onerror = (event) => {
          reject(new Error('Recording failed'));
        };

        this.mediaRecorder!.start(1000); // Collect data every second
      });
    } catch (error) {
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.mediaRecorder) {
      this.mediaRecorder = null;
    }
    this.audioChunks = [];
  }
}

/**
 * Checks if the browser supports audio recording
 */
export function checkAudioSupport(): { supported: boolean; error?: string } {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      supported: false,
      error: 'Audio recording is not supported in this browser',
    };
  }

  if (!window.MediaRecorder) {
    return {
      supported: false,
      error: 'MediaRecorder is not supported in this browser',
    };
  }

  return { supported: true };
}

/**
 * Requests microphone permissions
 */
export async function requestMicrophonePermission(): Promise<{ granted: boolean; error?: string }> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop()); // Stop immediately after permission check
    return { granted: true };
  } catch (error) {
    let errorMessage = 'Microphone access denied';
    
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone permission denied. Please allow microphone access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Microphone is already in use by another application.';
      }
    }
    
    return {
      granted: false,
      error: errorMessage,
    };
  }
}
