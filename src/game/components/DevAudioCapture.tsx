/**
 * Development-only Audio Capture Panel
 * Provides UI to capture Tone.js audio as WAV files
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Only show in development
const isDev = import.meta.env.DEV;

interface CaptureStatus {
  current: string;
  progress: number;
  total: number;
  completed: string[];
  errors: string[];
}

export function DevAudioCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState<CaptureStatus>({
    current: "",
    progress: 0,
    total: 0,
    completed: [],
    errors: [],
  });

  if (!isDev) return null;

  const handleCaptureSFX = async () => {
    setIsCapturing(true);
    setStatus({ current: "Initializing...", progress: 0, total: 9, completed: [], errors: [] });

    try {
      const { captureAllSFX } = await import("@/game/utils/audio-capture-browser");
      await captureAllSFX();
      setStatus((s) => ({ ...s, current: "Complete!", progress: 9 }));
    } catch (error) {
      setStatus((s) => ({ ...s, errors: [...s.errors, String(error)] }));
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCaptureMusic = async () => {
    setIsCapturing(true);
    setStatus({ current: "Capturing music (this takes a while)...", progress: 0, total: 5, completed: [], errors: [] });

    try {
      const { captureAllMusic } = await import("@/game/utils/audio-capture-browser");
      await captureAllMusic(30); // 30 seconds per track
      setStatus((s) => ({ ...s, current: "Complete!", progress: 5 }));
    } catch (error) {
      setStatus((s) => ({ ...s, errors: [...s.errors, String(error)] }));
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCaptureAll = async () => {
    setIsCapturing(true);
    setStatus({ current: "Starting full capture...", progress: 0, total: 14, completed: [], errors: [] });

    try {
      const { captureAllAudio } = await import("@/game/utils/audio-capture-browser");
      await captureAllAudio();
      setStatus((s) => ({ ...s, current: "All audio captured!", progress: 14 }));
    } catch (error) {
      setStatus((s) => ({ ...s, errors: [...s.errors, String(error)] }));
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-background/95 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Audio Capture (Dev)</CardTitle>
        <CardDescription className="text-xs">
          Export Tone.js audio to WAV files
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleCaptureSFX}
            disabled={isCapturing}
          >
            SFX
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleCaptureMusic}
            disabled={isCapturing}
          >
            Music
          </Button>
          <Button 
            size="sm" 
            onClick={handleCaptureAll}
            disabled={isCapturing}
          >
            All
          </Button>
        </div>

        {isCapturing && (
          <div className="space-y-2">
            <Progress value={(status.progress / status.total) * 100} />
            <p className="text-xs text-muted-foreground">{status.current}</p>
          </div>
        )}

        {status.errors.length > 0 && (
          <div className="text-xs text-destructive">
            {status.errors.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Convert WAV→OGG: <code className="bg-muted px-1">ffmpeg -i in.wav -c:a libvorbis -q:a 6 out.ogg</code>
        </p>
      </CardContent>
    </Card>
  );
}
