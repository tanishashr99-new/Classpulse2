"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import { motion } from "framer-motion";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { BookOpen, CheckCircle, Clock, Award, FileUp, Calendar as CalendarIcon, UserCheck, FileText, Activity, Video, Link as LinkIcon, Map, CheckCircle2, Trophy, Medal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const progressData = [
  { name: "Week 1", score: 65 },
  { name: "Week 2", score: 72 },
  { name: "Week 3", score: 85 },
  { name: "Week 4", score: 82 },
  { name: "Week 5", score: 90 },
  { name: "Week 6", score: 95 },
];



function DashboardContent() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [formData, setFormData] = useState({ name: "", rollno: "", registration_no: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [studentName, setStudentName] = useState("Student");
  const [loading, setLoading] = useState(true);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'overview';
  
  const handleTabChange = (value: string) => {
    router.push(`/student?tab=${value}`);
  };

  // Fetched data
  const [teachers, setTeachers] = useState<any[]>([]);
  const [meets, setMeets] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [studentMarks, setStudentMarks] = useState<any[]>([]);

  // Submission Modal States
  const [submitAssignmentOpen, setSubmitAssignmentOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadResources() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      
      if (session?.user) {
        // Route Guard
        const { data: teacherData } = await supabase.from('teachers').select('id').eq('id', session.user.id).single();
        if (teacherData) { window.location.href = '/teacher'; return; }

        const meta = session.user.user_metadata || {};
        const { data: dbProfile } = await supabase.from('students').select('name').eq('id', session.user.id).single();
        setStudentName(dbProfile?.name || meta.name || meta.full_name || "Student");
        
        if (!meta.rollno || !meta.registration_no) {
          setFormData(prev => ({ ...prev, name: dbProfile?.name || meta.name || meta.full_name || "" }));
          setShowOnboarding(true);
        }
      }
      
      // Fetch teachers from DB for Timetable
      const { data: tData } = await supabase.from('teachers').select('*');
      if (tData) setTeachers(tData);

      // Fetch upcoming proctor meets assigned to this student or 'all'
      if (session?.user) {
         const { data: mData } = await supabase.from('proctor_meets').select('*').or(`student_email.eq.${session.user.email},student_email.eq.all`);
         if (mData) setMeets(mData);
         
         const { data: aData } = await supabase.from('assignments').select('*').order('due_date', { ascending: true });
         const { data: mySubs } = await supabase.from('assignment_submissions').select('assignment_id').eq('student_id', session.user.id);
         
         if (aData) {
            const mappedAssignments = aData.map(a => {
              const isSubmitted = mySubs?.some(sub => sub.assignment_id === a.id);
              return { ...a, status: isSubmitted ? 'submitted' : 'pending' };
            });
            setAssignments(mappedAssignments);
         }
         
         const { data: attData } = await supabase.from('attendance_records').select('*').eq('student_id', session.user.id);
         if (attData) setAttendanceRecords(attData);

         const { data: matData } = await supabase.from('materials').select('*').order('created_at', { ascending: false });
         if (matData) setMaterials(matData);

         // Fetch marks for this student
         const { data: marksData } = await supabase.from('student_marks').select('*').eq('student_id', session.user.id);
         if (marksData) setStudentMarks(marksData);

         // Leaderboard data
         setCurrentUserId(session.user.id);
         const { data: allStudents } = await supabase.from('students').select('*');
         const { data: allAtt } = await supabase.from('attendance_records').select('student_id, status');
         const { data: allSubs } = await supabase.from('assignment_submissions').select('student_id, score');
         const { data: allAssignments } = await supabase.from('assignments').select('id');

         if (allStudents) {
           const totalAssignments = (allAssignments || []).length || 1;
           const attMap: Record<string, { present: number; total: number }> = {};
           (allAtt || []).forEach((r: any) => {
             if (!attMap[r.student_id]) attMap[r.student_id] = { present: 0, total: 0 };
             attMap[r.student_id].total++;
             if (r.status === 'present') attMap[r.student_id].present++;
           });
           const subMap: Record<string, { count: number; totalScore: number }> = {};
           (allSubs || []).forEach((s: any) => {
             if (!subMap[s.student_id]) subMap[s.student_id] = { count: 0, totalScore: 0 };
             subMap[s.student_id].count++;
             if (s.score != null) subMap[s.student_id].totalScore += s.score;
           });
           const ranked = (allStudents as any[]).map((s) => {
             const att = attMap[s.id] || { present: 0, total: 0 };
             const attPct = att.total > 0 ? (att.present / att.total) * 100 : 0;
             const sub = subMap[s.id] || { count: 0, totalScore: 0 };
             const subPct = (sub.count / totalAssignments) * 100;
             const avgScore = sub.count > 0 ? sub.totalScore / sub.count : 0;
             const cgpa = avgScore > 0 ? (avgScore / 100) * 10 : null;
             const score = attPct * 0.4 + subPct * 0.4 + (cgpa ? (cgpa / 10) * 100 * 0.2 : 0);
             return { ...s, attPct: Math.round(attPct), submittedCount: sub.count, cgpa, score: Math.round(score) };
           }).sort((a, b) => b.score - a.score);
           setLeaderboard(ranked);
         }
      }

      setLoading(false);
    }
    loadResources();

    // Set up Realtime Subscriptions
    const channel = supabase.channel('student_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, (payload) => {
         toast.success("Live Update: Attendance modified by your Faculty.");
         loadResources();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, (payload) => {
         toast.success("Live Update: Task active status modified by Faculty.");
         loadResources();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proctor_meets' }, (payload) => {
         toast.success("Live Update: Proctor meet scheduled/updated.");
         loadResources();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, (payload) => {
         toast.success("Live Update: New course material uploaded.");
        loadResources();
      })
      .subscribe();

    return () => {
      supabase.removeAllChannels();
    };
  }, [router]);

  const handleSubmissionUpload = async () => {
    if (!submissionFile || !selectedAssignment) { toast.error("Please select a file to submit"); return; }
    setIsSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    const fileExt = submissionFile.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `submissions/${fileName}`;
    
    const { error: uploadError } = await supabase.storage.from('class_resources').upload(filePath, submissionFile);
    if (uploadError) { toast.error("Upload failed: " + uploadError.message); setIsSubmitting(false); return; }
    
    const { data: publicData } = supabase.storage.from('class_resources').getPublicUrl(filePath);
    
    await supabase.from('assignment_submissions').delete().match({ student_id: session?.user?.id, assignment_id: selectedAssignment.id });
    
    const { error } = await supabase.from('assignment_submissions').insert({
      student_id: session?.user?.id,
      assignment_id: selectedAssignment.id,
      file_url: publicData.publicUrl,
      status: "pending"
    });
    
    setIsSubmitting(false);
    if (!error) {
      toast.success("Assignment submitted to teacher successfully!");
      setSubmitAssignmentOpen(false);
      
      setAssignments(prev => prev.map(a => a.id === selectedAssignment?.id ? { ...a, status: 'submitted' } : a));
      
      setSelectedAssignment(null);
      setSubmissionFile(null);
    } else { toast.error(error.message); }
  };

  const handleSaveProfile = async () => {
    if (!formData.name || !formData.rollno || !formData.registration_no) {
      toast.error("Please fill all fields");
      return;
    }
    
    setIsSaving(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    
    if (!user) {
      toast.error("Not authenticated");
      setIsSaving(false);
      return;
    }

    const { error: dbError } = await supabase
      .from('students')
      .upsert({
        id: user.id,
        email: user.email,
        name: formData.name,
        rollno: formData.rollno,
        registration_no: formData.registration_no,
      });

    if (dbError) {
      toast.error(dbError.message || "Failed to save into students table");
      setIsSaving(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        name: formData.name,
        rollno: formData.rollno,
        registration_no: formData.registration_no,
        setup_complete: true
      }
    });
    
    setIsSaving(false);
    
    if (authError) {
      toast.error(authError.message);
    } else {
      toast.success("Profile fully setup!");
      setShowOnboarding(false);
      window.location.reload(); 
    }
  };

  // Timetable Matrix Generator
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const periods = ["09:00 - 10:00", "10:00 - 11:00", "11:15 - 12:15", "01:00 - 02:00", "02:00 - 03:00"];

  const getTeacherForSlot = (dayIndex: number, periodIndex: number) => {
    if (teachers.length === 0) return null;
    // Deterministic selection based on modulo
    const index = (dayIndex * periods.length + periodIndex) % teachers.length;
    return teachers[index];
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse flex flex-col items-center justify-center">Loading your dashboard...</div>;

  const pendingAssignmentsCount = assignments.filter(a => a.status === 'pending').length;
  const completedAssignments = assignments.filter(a => a.status === 'submitted').length;
  
  const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
  const totalClasses = attendanceRecords.length;
  const overallAttendance = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

  const attendanceBySubject: any = {};
  attendanceRecords.forEach(r => {
    if (!attendanceBySubject[r.subject]) attendanceBySubject[r.subject] = { present: 0, total: 0, logs: [] };
    attendanceBySubject[r.subject].total += 1;
    if (r.status === 'present') attendanceBySubject[r.subject].present += 1;
    attendanceBySubject[r.subject].logs.push(r);
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back, {studentName} 👋</h2>
          <p className="text-muted-foreground mt-1 text-lg">Your academic command center.</p>
        </div>
        <Button onClick={() => {
           const pending = assignments.filter(a => a.status === 'pending');
           if (pending.length > 0) {
             setSelectedAssignment(pending[0]);
             setSubmitAssignmentOpen(true);
           } else {
             toast.success("No pending assignments left! You're fully caught up.");
           }
        }} className="rounded-full shadow-lg shadow-primary/20"><FileUp className="w-4 h-4 mr-2" /> Submit Work</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-all border-border/50 bg-background/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses Enrolled</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{teachers.length > 0 ? teachers.length : 5}</div>
            <p className="text-xs text-muted-foreground mt-1">Based on assigned Faculty</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all border-border/50 bg-background/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Attendance</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overallAttendance}%</div>
            <p className="text-xs text-muted-foreground mt-1">Acceptable limit: 75%</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all border-border/50 bg-background/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingAssignmentsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Active sync</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all border-border/50 bg-background/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current CGPA</CardTitle>
            <Award className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">8.4</div>
            <p className="text-xs text-muted-foreground mt-1">Top 15% of class</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4 border-border/50 bg-background/50 backdrop-blur-md shadow-sm">
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>Your weekly test scores and average progress.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tickMargin={12} stroke="var(--muted-foreground)" />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} stroke="var(--muted-foreground)" />
                    <Tooltip 
                      cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: 5 }} 
                      contentStyle={{ backgroundColor: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--foreground)' }}
                    />
                    <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--background)", stroke: "var(--primary)", strokeWidth: 2 }} activeDot={{ r: 8, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 border-border/50 bg-background/50 backdrop-blur-md shadow-sm flex flex-col">
              <CardHeader>
                <CardTitle>At a Glance</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center gap-6">
                {meets.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-center justify-between shadow-sm cursor-pointer" onClick={() => handleTabChange('meets')}>
                     <div className="flex items-center gap-3">
                       <div className="bg-primary/20 p-2 rounded-full"><Video className="text-primary w-5 h-5" /></div>
                       <div>
                         <h3 className="font-bold text-sm text-primary">Meeting Requested</h3>
                         <p className="text-xs text-muted-foreground mt-0.5">You have {meets.length} upcoming proctor meet(s).</p>
                       </div>
                     </div>
                     <Badge variant="default" className="shadow-md">View</Badge>
                  </motion.div>
                )}
                <div className="flex items-center gap-4 border p-4 rounded-xl">
                   <div className="bg-green-500/20 p-3 rounded-full"><CheckCircle className="text-green-500 w-6 h-6" /></div>
                   <div>
                     <h3 className="font-bold text-xl">{completedAssignments}</h3>
                     <p className="text-muted-foreground text-sm">Completed Assignments</p>
                   </div>
                </div>
                <div className="flex items-center gap-4 border p-4 rounded-xl">
                   <div className="bg-yellow-500/20 p-3 rounded-full"><Clock className="text-yellow-500 w-6 h-6" /></div>
                   <div>
                     <h3 className="font-bold text-xl">{pendingAssignmentsCount}</h3>
                     <p className="text-muted-foreground text-sm">Pending Submissions</p>
                   </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timetable">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/50">
              <CardTitle>Weekly Timetable</CardTitle>
              <CardDescription>Your dynamic schedule based on active registered faculty members.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {teachers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Faculty data is not populated yet. Admin must run setup script.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[120px] font-bold">Time</TableHead>
                      {days.map(day => <TableHead key={day} className="text-center font-bold">{day}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periods.map((period, periodIndex) => (
                      <TableRow key={period}>
                        <TableCell className="font-medium text-xs bg-muted/10 border-r">{period}</TableCell>
                        {days.map((day, dayIndex) => {
                          const teacher = getTeacherForSlot(dayIndex, periodIndex);
                          // Generate random styling or empty slots to make it look realistic
                          const isBreak = periodIndex === 2 && dayIndex % 2 !== 0; 
                          
                          if (isBreak) {
                            return <TableCell key={day} className="text-center text-muted-foreground italic bg-muted/5">Library Task</TableCell>;
                          }
                          
                          return (
                            <TableCell key={day} className="text-center border-l border-border/30 hover:bg-primary/5 transition-colors p-3">
                              <div className="font-semibold text-primary">{teacher?.subject}</div>
                              <div className="text-xs text-muted-foreground mt-1">{teacher?.name}</div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Attendance Details</CardTitle>
              <CardDescription>Daily logs and subject-wise metrics.</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(attendanceBySubject).length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/10">No attendance records found yet.</div>
              ) : (
                <div className="grid gap-8">
                  {Object.entries(attendanceBySubject).map(([sub, data]: any) => {
                    const percentage = Math.round((data.present / data.total) * 100);
                    const colorVar = percentage < 75 ? "bg-destructive" : percentage > 90 ? "bg-green-500" : "bg-primary";
                    return (
                      <div key={sub} className="space-y-4 pb-6 border-b border-border/40 last:border-0 last:pb-0">
                        <div className="flex justify-between text-sm items-center">
                          <span className="font-bold text-lg">{sub}</span>
                          <span className={percentage < 75 ? "text-destructive font-bold text-xl" : "text-foreground font-bold text-xl"}>{percentage}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div className={`h-full transition-all ${colorVar}`} style={{ width: `${percentage}%` }} />
                        </div>
                        <div className="text-sm text-muted-foreground flex justify-between px-1">
                          <span>Classes Attended: <span className="font-medium text-foreground">{data.present}</span></span>
                          <span>Total Classes: <span className="font-medium text-foreground">{data.total}</span></span>
                        </div>
                        <div className="mt-4 bg-muted/10 border rounded-lg overflow-hidden">
                           <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/30">
                                  <TableHead>Date & Time</TableHead>
                                  <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {data.logs.map((log: any) => (
                                  <TableRow key={log.id}>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {log.day && log.date && log.time ? (
                                        `${log.day}, ${log.date} at ${log.time}`
                                      ) : (
                                        new Date(log.created_at || new Date()).toLocaleString(undefined, { 
                                          weekday: 'short', 
                                          year: 'numeric', 
                                          month: 'short', 
                                          day: 'numeric', 
                                          hour: 'numeric', 
                                          minute: '2-digit', 
                                          hour12: true 
                                        })
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Badge variant="outline" className={log.status === 'present' ? 'text-green-500 border-green-500/30 bg-green-500/10' : 'text-red-500 border-red-500/30 bg-red-500/10'}>{log.status.toUpperCase()}</Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                           </Table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress">
          <div className="grid gap-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle>Academic Progress</CardTitle>
                <CardDescription>Marks entered by your faculty — live from the database.</CardDescription>
              </CardHeader>
              <CardContent>
                {studentMarks.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/10">
                    No marks have been recorded by your faculty yet. Check back after assessments.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Cycle Test 1</TableHead>
                        <TableHead>Cycle Test 2</TableHead>
                        <TableHead>Term Grade</TableHead>
                        <TableHead className="text-right">CGPA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentMarks.map((row) => {
                        const gradeColor = row.term_grade === 'O' || row.term_grade === 'A+' ? 'bg-green-500/20 text-green-500 border-green-500/20' : row.term_grade === 'F' ? 'bg-destructive/20 text-destructive border-destructive/20' : 'bg-primary/20 text-primary border-primary/20';
                        return (
                          <TableRow key={row.id}>
                            <TableCell className="font-bold">{row.subject}</TableCell>
                            <TableCell className="text-muted-foreground">{row.cycle_test_1 != null ? `${row.cycle_test_1}/100` : '—'}</TableCell>
                            <TableCell className="text-muted-foreground">{row.cycle_test_2 != null ? `${row.cycle_test_2}/100` : '—'}</TableCell>
                            <TableCell><Badge className={gradeColor}>{row.term_grade || '—'}</Badge></TableCell>
                            <TableCell className="text-right font-bold text-green-500">{row.cgpa ?? '—'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="roadmap">
          <div className="grid gap-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle>Subject Roadmaps</CardTitle>
                <CardDescription>Visual track of syllabus completion by your faculty.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-12">
                  {[
                    { subject: "DSA", professor: "Dr. Alan Turing", chapters: ["Chapter 1: Arrays & Time Complexity", "Chapter 2: Linked Lists", "Chapter 3: Stacks & Queues", "Chapter 4: Trees & Binary Search Trees", "Chapter 5: Graphs & Traversals", "Chapter 6: Dynamic Programming & Backtracking"] },
                    { subject: "Python", professor: "Prof. Barbara Liskov", chapters: ["Chapter 1: Basics, Variables & Data Types", "Chapter 2: Control Flow & Functions", "Chapter 3: Object-Oriented Python", "Chapter 4: Exceptions & File Handling", "Chapter 5: Libraries (NumPy/Pandas)", "Chapter 6: Django Web Framework"] },
                    { subject: "IML", professor: "Prof. Grace Hopper", chapters: ["Chapter 1: Data Preprocessing & EDA", "Chapter 2: Linear & Logistic Regression", "Chapter 3: Decision Trees & Random Forests", "Chapter 4: Support Vector Machines (SVM)", "Chapter 5: K-Means Clustering", "Chapter 6: Introduction to Neural Networks"] },
                    { subject: "Computer Networks", professor: "Dr. Tim Berners-Lee", chapters: ["Chapter 1: Fundamentals & OSI Reference Model", "Chapter 2: Physical & Data Link Layers", "Chapter 3: Network Layer & IP Routing", "Chapter 4: Transport Layer (TCP/UDP)", "Chapter 5: Application Layer (HTTP/DNS)", "Chapter 6: Network Security Basics"] },
                    { subject: "OOPS", professor: "Dr. John von Neumann", chapters: ["Chapter 1: Intro to Object-Oriented Paradigms", "Chapter 2: Classes, Objects & Constructors", "Chapter 3: Encapsulation & Data Hiding", "Chapter 4: Inheritance & Polymorphism", "Chapter 5: Abstract Classes & Interfaces", "Chapter 6: Design Patterns (SOLID)"] },
                    { subject: "COA", professor: "Prof. Ada Lovelace", chapters: ["Chapter 1: Logic Gates & Boolean Algebra", "Chapter 2: Number Systems & Data Representation", "Chapter 3: CPU Architecture & Registers", "Chapter 4: Instruction Sets & Addressing Modes", "Chapter 5: Instruction Pipelining", "Chapter 6: Memory Hierarchy & Cache"] },
                    { subject: "DBMS", professor: "Dr. Edgar Codd", chapters: ["Chapter 1: Intro to Database Architectures", "Chapter 2: Entity-Relationship (ER) Modeling", "Chapter 3: Relational Algebra & Calculus", "Chapter 4: Structured Query Language (SQL)", "Chapter 5: Normalization (1NF to BCNF)", "Chapter 6: Transactions & Concurrency Control"] },
                    { subject: "Java", professor: "Dr. Donald Knuth", chapters: ["Chapter 1: JVM Architecture & Syntax Fundamentals", "Chapter 2: Strings, Arrays & Memory", "Chapter 3: Exception Handling & File I/O", "Chapter 4: Java Collections Framework", "Chapter 5: Multithreading & Synchronization", "Chapter 6: Spring Boot Introduction"] },
                    { subject: "Software Engineering", professor: "Prof. Linus Torvalds", chapters: ["Chapter 1: SDLC Models (Waterfall, Spiral, V-Model)", "Chapter 2: Requirements Engineering", "Chapter 3: System Design & UML Diagrams", "Chapter 4: Agile Methodologies (Scrum/Kanban)", "Chapter 5: Software Testing Strategies", "Chapter 6: Deployment & CI/CD Pipelines"] },
                  ].map((syllabus, idx) => (
                    <div key={idx} className="space-y-4">
                      <div className="flex justify-between items-center bg-muted/20 p-3 rounded-lg border border-border/50">
                        <div>
                          <h3 className="font-bold text-lg flex items-center gap-2"><Map className="w-5 h-5 text-primary"/> {syllabus.subject}</h3>
                          <p className="text-xs text-muted-foreground ml-7 font-medium">Instructor: {syllabus.professor}</p>
                        </div>
                      </div>
                      <div className="relative border-l-2 border-primary/20 ml-5 md:ml-6 space-y-6 pb-4">
                        {syllabus.chapters.map((chapter, i) => (
                          <div key={i} className="relative pl-6">
                            <div className="absolute -left-[11px] top-0.5 flex items-center justify-center rounded-full p-1 bg-primary text-background shadow-sm shadow-primary/30">
                               <div className="w-3 h-3 flex items-center justify-center text-[10px] font-bold">{i + 1}</div>
                            </div>
                            <div>
                               <h4 className="text-sm font-semibold text-foreground tracking-tight">{chapter}</h4>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>All Tasks & Deadlines</CardTitle>
                <CardDescription>Track completions and upcoming deadlines.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {assignments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">{assignment.title}</TableCell>
                        <TableCell>{assignment.subject}</TableCell>
                        <TableCell className="text-muted-foreground flex items-center gap-1.5 whitespace-nowrap"><Clock className="w-3 h-3"/> {new Date(assignment.due_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                             assignment.difficulty === "High" ? "border-red-500/50 text-red-500" :
                             assignment.difficulty === "Medium" ? "border-yellow-500/50 text-yellow-500" :
                             "border-green-500/50 text-green-500"
                          }>
                            {assignment.difficulty || "Medium"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <div className="flex items-center justify-end gap-2">
                             {assignment.file_url && (
                               <Button size="sm" variant="outline" className="border-secondary text-secondary-foreground h-7" onClick={() => window.open(assignment.file_url, '_blank')}><LinkIcon className="w-3 h-3 mr-1"/> Download</Button>
                             )}
                             {assignment.status === 'submitted' ? (
                               <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 px-3 cursor-default"><CheckCircle className="w-3 h-3 mr-1"/> Submitted</Badge>
                             ) : (
                               <Button size="sm" variant="outline" className="border-primary/30 text-primary h-7" onClick={() => { setSelectedAssignment(assignment); setSubmitAssignmentOpen(true); }}>Submit Hand-in</Button>
                             )}
                           </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/10">No active tasks from your faculty right now.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Course Materials</CardTitle>
                <CardDescription>Resources provided by your faculty.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {materials.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Date Added</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((mat) => (
                      <TableRow key={mat.id}>
                        <TableCell className="font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-primary"/>{mat.title}</TableCell>
                        <TableCell>{mat.subject}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap pt-3"><Clock className="w-3 h-3 inline-block mr-1"/> {new Date(mat.created_at || new Date()).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                           <Button size="sm" variant="outline" className="border-primary/30 text-primary h-7" onClick={() => window.open(mat.link, '_blank')}><LinkIcon className="w-3 h-3 mr-1"/>Open</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/10">No materials available right now.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meets">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Upcoming Proctor Meets</CardTitle>
              <CardDescription>Video sessions requested by your faculty.</CardDescription>
            </CardHeader>
            <CardContent>
              {meets.length === 0 ? (
                 <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/10">You have no upcoming proctor meets.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Scheduled Time</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meets.map((m) => {
                      const isPast = new Date(m.meeting_time) < new Date();
                      const displayStatus = (m.status === 'pending' && isPast) ? 'failed' : (m.status || 'pending');
                      
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">
                             <div className="text-primary">{m.teacher_subject}</div>
                             <div className="text-xs text-muted-foreground">{m.teacher_name}</div>
                          </TableCell>
                          <TableCell>{m.topic}</TableCell>
                          <TableCell>
                             <Badge variant="outline" className={m.student_email === 'all' ? 'border-primary/50 text-primary' : 'border-blue-500/50 text-blue-500'}>
                                {m.student_email === 'all' ? 'All Class' : "1-on-1"}
                             </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground flex items-center gap-1.5 pt-4">
                              <Clock className="w-3 h-3" /> {new Date(m.meeting_time).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short'})}
                          </TableCell>
                          <TableCell className="text-right">
                             {displayStatus === 'happened' ? (
                               <Badge className="bg-green-500/10 text-green-500 border-green-500/20 w-[90px] justify-center">Completed</Badge>
                             ) : displayStatus === 'failed' ? (
                               <Badge className="bg-red-500/10 text-red-500 border-red-500/20 w-[90px] justify-center">Failed</Badge>
                             ) : (
                               <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 w-[90px] justify-center">Upcoming</Badge>
                             )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" /> Class Leaderboard</CardTitle>
              <CardDescription>Rankings based on attendance (40%), assignments submitted (40%), and CGPA (20%).</CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/10">No student data available yet.</div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[33px] top-9 bottom-9 w-px bg-slate-200 dark:bg-white/25 z-0" />
                <div className="space-y-3 relative z-10">
                  {leaderboard.map((student, index) => {
                    const isMe = student.id === currentUserId;
                    const rankColors = ['text-yellow-500', 'text-slate-400', 'text-amber-600'];
                    const rankBg = ['bg-yellow-500/10 border-yellow-500/30', 'bg-slate-400/10 border-slate-400/30', 'bg-amber-600/10 border-amber-600/30'];
                    const rank = index + 1;
                    return (
                      <motion.div
                        key={student.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isMe ? 'border-primary/50 bg-primary/5 shadow-sm' : 'border-border/40 bg-muted/5 hover:bg-muted/20'}`}
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 border ${rank <= 3 ? rankBg[rank - 1] : 'bg-muted/20 border-border/30'} ${rank <= 3 ? rankColors[rank - 1] : 'text-muted-foreground'}`}>
                          {rank <= 3 ? <Medal className="w-4 h-4" /> : `#${rank}`}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate">{student.name || 'Unknown'}</span>
                            {isMe && <Badge className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30">You</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{student.rollno}</div>
                        </div>
                        <div className="hidden sm:flex items-center gap-6 text-center">
                          <div>
                            <div className={`text-sm font-bold ${student.attPct < 75 ? 'text-destructive' : 'text-green-500'}`}>{student.attPct}%</div>
                            <div className="text-[10px] text-muted-foreground">Attendance</div>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-blue-500">{student.submittedCount}</div>
                            <div className="text-[10px] text-muted-foreground">Submitted</div>
                          </div>
                          <div>
                            <div className="text-sm font-bold">{student.cgpa != null ? student.cgpa.toFixed(1) : '—'}</div>
                            <div className="text-[10px] text-muted-foreground">CGPA</div>
                          </div>
                        </div>
                        <div className={`text-right ml-2 flex-shrink-0`}>
                          <div className={`text-lg font-bold ${rank <= 3 ? rankColors[rank - 1] : 'text-foreground'}`}>{student.score}</div>
                          <div className="text-[10px] text-muted-foreground">Score</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showOnboarding}>
        <DialogContent className="sm:max-w-[425px] [&>button]:hidden">
          <DialogHeader>
            <DialogTitle>Complete Your Profile</DialogTitle>
            <DialogDescription>
              Since this is your first time logging in, please verify your student details so teachers can identify your work.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rollno">Roll Number</Label>
              <Input
                id="rollno"
                value={formData.rollno}
                onChange={(e) => setFormData({ ...formData, rollno: e.target.value })}
                placeholder="19CS001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registration_no">Registration Number</Label>
              <Input
                id="registration_no"
                value={formData.registration_no}
                onChange={(e) => setFormData({ ...formData, registration_no: e.target.value })}
                placeholder="20194000000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full">
              {isSaving ? "Saving..." : "Save Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StudentDashboard() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-muted-foreground animate-pulse flex flex-col items-center justify-center">Loading your dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
