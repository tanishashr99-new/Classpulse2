"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  MapPin, 
  Clock, 
  UserCheck, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Camera, 
  ArrowLeft 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Status = "checking" | "success" | "failed";

export default function FaceAttendancePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const faceApiRef = useRef<any>(null);

  // States
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentDescriptor, setStudentDescriptor] = useState<number[] | null>(null);
  const [sessionSubject, setSessionSubject] = useState("");
  
  // Checks
  const [teacherStatus, setTeacherStatus] = useState<Status>("checking");
  const [timeStatus, setTimeStatus] = useState<Status>("checking");
  const [gpsStatus, setGpsStatus] = useState<Status>("checking");
  const [faceStatus, setFaceStatus] = useState<Status>("checking");

  const COLLEGE_COORDS = { lat: 19.04867, lng: 83.83330 };
  const ALLOWED_RADIUS_KM = 50; // As requested for testing

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  const deg2rad = (deg: number) => deg * (Math.PI / 180);

  useEffect(() => {
    const runChecks = async () => {
      // 1. Get Session & Basic Auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // Fetch student info
      const { data: student } = await supabase
        .from('students')
        .select('name')
        .eq('id', session.user.id)
        .single();
      
      if (student) setStudentName(student.name);

      // Check for saved descriptor
      const { data: descriptorData } = await supabase
        .from('face_descriptors')
        .select('descriptor')
        .eq('student_id', session.user.id)
        .single();
      
      if (descriptorData) {
        setStudentDescriptor(descriptorData.descriptor);
      }

      // 2. Check Teacher Session
      try {
        const { data: activeSession, error: sessionError } = await supabase
          .from('attendance_sessions')
          .select('*')
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .order('started_at', { ascending: false })
          .limit(1)
          .single();

        if (sessionError || !activeSession) {
          setTeacherStatus("failed");
          setTimeStatus("failed");
        } else {
          setTeacherStatus("success");
          setSessionSubject(activeSession.subject);
          
          // 3. Time status is already checked by query, but let's be explicit
          const expiresAt = new Date(activeSession.expires_at);
          if (expiresAt > new Date()) {
            setTimeStatus("success");
          } else {
            setTimeStatus("failed");
          }
        }
      } catch (err) {
        setTeacherStatus("failed");
        setTimeStatus("failed");
      }

      // 4. GPS Check
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const dist = calculateDistance(
              position.coords.latitude,
              position.coords.longitude,
              COLLEGE_COORDS.lat,
              COLLEGE_COORDS.lng
            );
            
            if (dist <= ALLOWED_RADIUS_KM) {
              setGpsStatus("success");
            } else {
              setGpsStatus("failed");
            }
          },
          (error) => {
            console.error("GPS Error:", error);
            setGpsStatus("failed");
          }
        );
      } else {
        setGpsStatus("failed");
      }

      // 5. Face Models
      try {
        const faceapi = await import('face-api.js');
        faceApiRef.current = faceapi;
        const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        
        setModelsLoaded(true);
        setFaceStatus("success");
      } catch (error) {
        console.error("Model Error:", error);
        setFaceStatus("failed");
      }
    };

    runChecks();
  }, [router]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast.error("Could not access camera");
    }
  };

  const handleMarkAttendance = async () => {
    if (!videoRef.current || !modelsLoaded || !faceApiRef.current || !studentDescriptor) return;
    
    setIsScanning(true);
    try {
      const detection = await faceApiRef.current.detectSingleFace(
        videoRef.current, 
        new faceApiRef.current.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        toast.error("No face detected. Please look at camera");
        setIsScanning(false);
        return;
      }

      // Euclidean Distance comparison
      const distance = faceApiRef.current.euclideanDistance(detection.descriptor, studentDescriptor);
      
      if (distance < 0.5) {
        // Match! Submit attendance
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Session expired");

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });

        const { error: insertError } = await supabase
          .from('attendance_records')
          .insert({
            student_id: session.user.id,
            student_name: studentName,
            subject: sessionSubject,
            status: 'present',
            date: dateStr,
            time: timeStr,
            day: weekday
          });

        if (insertError) throw insertError;

        setAttendanceMarked(true);
        toast.success("Attendance marked successfully!");
      } else {
        toast.error("Face not recognized. Please try again.");
      }
    } catch (error: any) {
      console.error("Attendance error:", error);
      toast.error(error.message || "An error occurred");
    } finally {
      setIsScanning(false);
    }
  };

  const StatusCard = ({ title, status, icon: Icon, errorMsg }: { title: string, status: Status, icon: any, errorMsg?: string }) => (
    <Card className="border-border/50 shadow-sm overflow-hidden group hover:shadow-md transition-all">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            status === "success" ? "bg-green-500/10 text-green-500" : 
            status === "failed" ? "bg-red-500/10 text-red-500" : 
            "bg-primary/10 text-primary"
          }`}>
            <Icon size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            {status === "failed" && errorMsg && <p className="text-[10px] text-red-500 mt-0.5">{errorMsg}</p>}
          </div>
        </div>
        <div>
          {status === "checking" && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
          {status === "success" && <CheckCircle className="w-5 h-5 text-green-500" />}
          {status === "failed" && <XCircle className="w-5 h-5 text-red-500" />}
        </div>
      </CardContent>
    </Card>
  );

  const allChecksPassed = teacherStatus === "success" && timeStatus === "success" && gpsStatus === "success" && faceStatus === "success";

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
           <Button variant="ghost" size="sm" onClick={() => router.push('/student')} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
             <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
           </Button>
           <h1 className="text-3xl font-bold tracking-tight">Biometric Attendance</h1>
           <p className="text-muted-foreground">Verify your identity and location to mark attendance.</p>
        </div>
        <Badge variant="outline" className="px-4 py-1.5 h-auto text-sm bg-background">
          <ShieldCheck className="w-4 h-4 mr-2 text-primary" /> Student Portal
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard 
          title="Teacher Session" 
          status={teacherStatus} 
          icon={UserCheck} 
          errorMsg="No active session found"
        />
        <StatusCard 
          title="Time Window" 
          status={timeStatus} 
          icon={Clock} 
          errorMsg="Session has expired"
        />
        <StatusCard 
          title="GPS Location" 
          status={gpsStatus} 
          icon={MapPin} 
          errorMsg="Not on campus (50km radius)"
        />
        <StatusCard 
          title="Face Models" 
          status={faceStatus} 
          icon={ShieldCheck} 
          errorMsg="Failed to load engine"
        />
      </div>

      {!attendanceMarked ? (
        <Card className="border-border/50 shadow-sm overflow-hidden rounded-2xl">
          <CardHeader className="text-center pb-2 bg-muted/20 border-b">
            <CardTitle className="flex items-center justify-center gap-2">
              <Camera className="w-6 h-6 text-primary" /> Face Verification
            </CardTitle>
            <CardDescription>
              {allChecksPassed ? "Ready to verify your identity." : "Complete all requirements above to enable scanning."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-10 space-y-6">
            <div className="relative w-full max-w-lg aspect-video bg-black rounded-2xl overflow-hidden border-4 border-muted shadow-2xl">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover -scale-x-100"
              />
              {isScanning && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <div className="text-white font-bold animate-pulse text-lg tracking-widest uppercase">Analyzing...</div>
                    </div>
                 </div>
              )}
              {!allChecksPassed && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm px-6 text-center">
                  <div className="max-w-xs space-y-4">
                    <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
                    <p className="text-muted-foreground font-medium">Please resolve all checks above to unlock the camera.</p>
                  </div>
                </div>
              )}
            </div>

            {studentDescriptor ? (
              allChecksPassed && !videoRef.current?.srcObject && (
                <Button 
                  size="lg" 
                  onClick={startCamera} 
                  className="rounded-xl px-10 h-14 text-lg font-bold shadow-xl shadow-primary/20"
                >
                  <Camera className="w-6 h-6 mr-2" /> Open Camera & Authenticate
                </Button>
              )
            ) : (
              <div className="text-center space-y-4 p-8 bg-destructive/5 border border-destructive/20 rounded-2xl max-w-md">
                 <p className="text-destructive font-semibold">Face data not found on server.</p>
                 <p className="text-sm text-muted-foreground">You must register your biometric descriptor before you can mark attendance.</p>
                 <Button onClick={() => router.push('/student/face-register')} variant="destructive" className="w-full rounded-xl">
                    Register Face Now
                 </Button>
              </div>
            )}

            {videoRef.current?.srcObject && !attendanceMarked && (
               <Button 
                 size="lg" 
                 disabled={isScanning}
                 onClick={handleMarkAttendance} 
                 className="rounded-xl px-12 h-16 text-xl font-bold bg-primary shadow-2xl shadow-primary/30 w-full max-w-md group"
               >
                 {isScanning ? (
                   <> <Loader2 className="w-6 h-6 mr-2 animate-spin" /> VERIFYING ID... </>
                 ) : (
                   <> <ShieldCheck className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform" /> VERIFY IDENTITY </>
                 )}
               </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-500/50 bg-green-500/5 shadow-2xl rounded-2xl overflow-hidden p-10 text-center animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/30">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-4xl font-extrabold text-green-700 dark:text-green-400 mb-2">Success!</h2>
          <p className="text-2xl font-bold text-foreground mb-4">Hello {studentName}!</p>
          <div className="bg-green-500/10 border border-green-500/20 py-4 px-8 rounded-2xl inline-block mt-4">
             <p className="text-green-700 dark:text-green-300 font-semibold text-xl">Attendance Marked Successfully ✅</p>
             <p className="text-green-600/70 text-sm mt-1">Course: {sessionSubject}</p>
          </div>
          <div className="mt-10">
            <Button variant="outline" onClick={() => router.push('/student')} className="rounded-xl h-12 px-8">
              Return to Dashboard
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
