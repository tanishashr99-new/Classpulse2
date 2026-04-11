"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function FaceRegisterPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const faceApiRef = useRef<any>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadModels = async () => {
      try {
        const faceapi = await import('face-api.js');
        faceApiRef.current = faceapi;
        const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
      } catch (error) {
        console.error("Error loading face models:", error);
        toast.error("Failed to load face models");
      }
    };

    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error starting video:", error);
        toast.error("Could not access camera. Please allow camera access.");
      }
    };

    loadModels();
    startVideo();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleRegisterFace = async () => {
    if (!videoRef.current || !modelsLoaded || !faceApiRef.current) return;
    
    setIsCapturing(true);
    try {
      const detection = await faceApiRef.current.detectSingleFace(
        videoRef.current, 
        new faceApiRef.current.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        toast.error("No face detected. Please look at camera");
        setIsCapturing(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (!refreshed.session) {
          toast.error("Session not found. Please log in again.");
          router.push("/login");
          return;
        }
      }
      const currentSession = session || (await supabase.auth.getSession()).data.session;

      const descriptorArray = Array.from(detection.descriptor);

      // Save to Supabase
      const { error: deleteError } = await supabase
        .from('face_descriptors')
        .delete()
        .eq('student_id', currentSession?.user?.id);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from('face_descriptors')
        .insert({
          student_id: currentSession?.user?.id,
          descriptor: descriptorArray
        });

      if (insertError) throw insertError;

      setIsRegistered(true);
      toast.success("Face Registered Successfully!");
    } catch (error: any) {
      console.error("Error registering face:", error);
      toast.error(error.message || "An error occurred during registration");
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
      <Card className="w-full max-w-2xl bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden animte-in zoom-in duration-500">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Camera className="w-6 h-6 text-primary" /> Face Registration
          </CardTitle>
          <CardDescription>
            Register your face to enable biometric attendance marking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6 flex flex-col items-center">
          <div className="relative w-full max-w-md aspect-video bg-black rounded-xl overflow-hidden border-4 border-muted shadow-inner">
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-cover -scale-x-100"
            />
            {!modelsLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                <p className="text-sm font-medium">Loading face models...</p>
              </div>
            )}
            {isCapturing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                   <div className="text-white font-bold animate-pulse text-lg">Scanning...</div>
                </div>
            )}
          </div>

          {isRegistered && (
            <div className="w-full p-4 bg-green-500/10 border border-green-500/50 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
               <div className="text-green-700 dark:text-green-400 font-semibold">
                Face Registered Successfully! ✅ You can now mark attendance
               </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4 pt-2 pb-8 px-8">
          {!isRegistered ? (
            <Button 
              onClick={handleRegisterFace} 
              disabled={!modelsLoaded || isCapturing} 
              className="w-full sm:flex-1 h-12 text-lg rounded-xl shadow-lg shadow-primary/20"
            >
              {isCapturing ? (
                <> <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing... </>
              ) : (
                <> <Camera className="w-5 h-5 mr-2" /> Capture & Register My Face </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={() => router.push('/student/face-attendance')}
              className="w-full sm:flex-1 h-12 text-lg rounded-xl bg-primary shadow-lg shadow-primary/20 group"
            >
              Go to Face Attendance <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
