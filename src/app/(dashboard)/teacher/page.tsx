"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Users, FileText, Upload, Plus, AlertCircle, Calendar, BookOpen, Activity, CheckSquare, Clock, Video, Link as LinkIcon, Trophy, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const classPerformance = [
  { name: "Quiz 1", avg: 85 },
  { name: "Midterm", avg: 76 },
  { name: "Assignment", avg: 81 },
  { name: "Quiz 2", avg: 92 },
  { name: "Project", avg: 88 }
];


function TeacherDashboardContent() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [meets, setMeets] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);
  
  const [meetForm, setMeetForm] = useState({ student_email: "all", topic: "", meet_link: "", date: "", time: "" });
  const [attendanceConfig, setAttendanceConfig] = useState({ day: "", date: "", time: "" });
  const [attendanceLocked, setAttendanceLocked] = useState(false);

  // Material & Assignment Modals
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [materialTitle, setMaterialTitle] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDeadline, setAssignmentDeadline] = useState("");
  const [assignmentGivenDate, setAssignmentGivenDate] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);

  // Marks state
  const [marksForm, setMarksForm] = useState({ student_id: "", student_name: "", cycle_test_1: "", cycle_test_2: "", term_grade: "", cgpa: "" });
  const [isSavingMarks, setIsSavingMarks] = useState(false);
  const [existingMarks, setExistingMarks] = useState<any[]>([]);

  // Student profile modal state
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(false);

  // Sync Tabs with URL
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'overview';
  
  const handleTabChange = (value: string) => {
    router.push(`/teacher?tab=${value}`);
  };

  useEffect(() => {
    async function loadData() {
      // Load current user context
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      
      if (session?.user) {
        setTeacherProfile(session.user.user_metadata);
      }
      
      // Load all teachers for timetable computation
      const { data: tData } = await supabase.from('teachers').select('*');
      if (tData) setTeachers(tData);

      // Load specific students
      const { data: sData } = await supabase.from('students').select('*');
      if (sData) setStudents(sData);

      // Load assignments for this teacher
      if (session?.user) {
        // Load teacher profile
        const { data: teacherData, error: tError } = await supabase.from('teachers').select('*').eq('id', session.user.id).single();
        if (teacherData) {
           setTeacherProfile(teacherData);
        } else {
           const { data: studentData } = await supabase.from('students').select('id').eq('id', session.user.id).single();
           if (studentData) { window.location.href = "/student"; return; }
        }
        const { data: aData } = await supabase.from('assignments').select('*').eq('teacher_id', session.user.id);
        if (aData) setAssignments(aData);
      }

      // Load scheduled meets
      const { data: mData } = await supabase.from('proctor_meets').select('*').eq('teacher_id', session?.user?.id);
      if (mData) setMeets(mData);

      // Load materials
      const { data: matData } = await supabase.from('materials').select('*').eq('teacher_id', session?.user?.id);
      if (matData) setMaterials(matData);

      // Load pending submissions
      const { data: myAsgmts } = await supabase.from('assignments').select('id, title').eq('teacher_id', session?.user?.id);
      if (myAsgmts && myAsgmts.length > 0) {
        const asgmtIds = myAsgmts.map(a => a.id);
        const { data: pSubs } = await supabase.from('assignment_submissions').select('*').in('assignment_id', asgmtIds).eq('status', 'pending');
        if (pSubs) {
          const mappedSubs = pSubs.map(ps => {
            const student = sData?.find(s => s.id === ps.student_id); // Use sData from earlier student load
            const asgmt = myAsgmts.find(a => a.id === ps.assignment_id);
            return { ...ps, student_name: student?.name || "Unknown", assignment_title: asgmt?.title || "Unknown" };
          });
          setPendingSubmissions(mappedSubs);
        }
      }
      
      // Load existing marks entered by this teacher
      if (session?.user) {
        const { data: marksData } = await supabase.from('student_marks').select('*').eq('teacher_id', session.user.id);
        if (marksData) setExistingMarks(marksData);
      }

      setLoading(false);
    }
    loadData();

    // Set up Realtime Subscriptions
    const channel = supabase.channel('teacher_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
         loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, (payload) => {
         loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, (payload) => {
         loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proctor_meets' }, (payload) => {
         loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, (payload) => {
         loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignment_submissions' }, (payload) => {
         loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleScheduleMeet = async () => {
    if (!meetForm.topic || !meetForm.date || !meetForm.time) {
      alert("Please fill necessary meeting details.");
      return;
    }
    setIsScheduling(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    const combinedDate = new Date(`${meetForm.date}T${meetForm.time}`).toISOString();
    
    const { error } = await supabase.from('proctor_meets').insert({
       teacher_id: session?.user?.id,
       teacher_name: teacherProfile?.name || "Teacher",
       teacher_subject: teacherProfile?.subject || "Subject",
       student_email: meetForm.student_email,
       topic: meetForm.topic,
       meeting_time: combinedDate,
       meet_link: "N/A"
    });
    
    setIsScheduling(false);
    if (!error) {
       alert("Proctor meet scheduled!");
       setMeetForm({ student_email: "all", topic: "", meet_link: "", date: "", time: "" });
       // Reload meets
       const { data: mData } = await supabase.from('proctor_meets').select('*').eq('teacher_id', session?.user?.id);
       if (mData) setMeets(mData);
    } else {
       alert(error.message);
    }
  };

  const handleMeetStatusUpdate = async (meetId: string, newStatus: string) => {
    const { error } = await supabase.from('proctor_meets').update({ status: newStatus }).eq('id', meetId);
    if (!error) {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: mData } = await supabase.from('proctor_meets').select('*').eq('teacher_id', session?.user?.id);
      if (mData) setMeets(mData);
    } else {
      alert("Error: " + error.message);
    }
  };

  const handleCreateAssignmentSubmit = async () => {
    if (!assignmentTitle || !assignmentDeadline || !assignmentGivenDate) { alert("Please fill all assignment fields."); return; }
    setIsUploading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    let fileUrl = null;
    if (uploadFile) {
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `assignments/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('class_resources').upload(filePath, uploadFile);
      if (uploadError) { alert("Upload failed: " + uploadError.message); setIsUploading(false); return; }
      const { data: publicData } = supabase.storage.from('class_resources').getPublicUrl(filePath);
      fileUrl = publicData.publicUrl;
    }
    
    const { error } = await supabase.from('assignments').insert({
      teacher_id: session?.user?.id,
      subject: teacherProfile?.subject || "Subject",
      title: assignmentTitle,
      due_date: new Date(assignmentDeadline).toISOString(),
      given_date: new Date(assignmentGivenDate).toISOString(),
      file_url: fileUrl
    });
    
    setIsUploading(false);
    if (!error) {
      alert("Assignment published securely!");
      setIsAssignmentModalOpen(false);
      setAssignmentTitle("");
      setAssignmentDeadline("");
      setAssignmentGivenDate("");
      setUploadFile(null);
      const { data: aData } = await supabase.from('assignments').select('*').eq('teacher_id', session?.user?.id);
      if (aData) setAssignments(aData);
    } else { alert(error.message); }
  };

  const handleUploadMaterialSubmit = async () => {
    if (!materialTitle || !uploadFile) { alert("Please provide both title and a file to upload."); return; }
    setIsUploading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    const fileExt = uploadFile.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `materials/${fileName}`;
    
    const { error: uploadError } = await supabase.storage.from('class_resources').upload(filePath, uploadFile);
    if (uploadError) { alert("Upload failed: " + uploadError.message); setIsUploading(false); return; }
    
    const { data: publicData } = supabase.storage.from('class_resources').getPublicUrl(filePath);
    
    const { error } = await supabase.from('materials').insert({
      teacher_id: session?.user?.id,
      subject: teacherProfile?.subject || "Subject",
      title: materialTitle,
      link: publicData.publicUrl
    });
    
    setIsUploading(false);
    if (!error) {
      alert("Material uploaded securely!");
      setIsMaterialModalOpen(false);
      setMaterialTitle("");
      setUploadFile(null);
      const { data: matData } = await supabase.from('materials').select('*').eq('teacher_id', session?.user?.id);
      if (matData) setMaterials(matData);
    } else { alert(error.message); }
  };

  const handleApproveSubmission = async (studentId: string, assignmentId: string) => {
    const { error } = await supabase.from('assignment_submissions')
      .update({ status: 'approved', score: 100 })
      .match({ student_id: studentId, assignment_id: assignmentId });
    if (!error) {
      alert("Submission Approved and scored!");
      window.location.reload();
    } else { alert(error.message); }
  };

  const markAttendance = async (studentId: string, studentName: string, status: string) => {
    if (!attendanceLocked) {
      alert("Please start the attendance session by configuring Day, Date, and Time first.");
      return;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    
    // Parse formatting reliably from fixed inputs
    const dayString = attendanceConfig.day;
    
    const [year, month, day] = attendanceConfig.date.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const dateString = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const [hourStr, minStr] = attendanceConfig.time.split(':');
    let hour = parseInt(hourStr);
    const min = minStr;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12; 
    const timeString = `${hour}:${min} ${ampm}`;

    const { data, error } = await supabase.from('attendance_records').insert({
      teacher_id: session?.user?.id,
      subject: teacherProfile?.subject || "Subject",
      student_id: studentId,
      student_name: studentName,
      status: status,
      day: dayString,
      date: dateString,
      time: timeString
    }).select().single();
    
    if (!error && data) {
      alert(`Marked ${studentName} as ${status} on ${data.day}, ${data.date} at ${data.time}`);
    } else if (!error) {
      alert(`Marked ${studentName} as ${status} on ${dayString}, ${dateString} at ${timeString}`);
    } else {
      alert(error.message);
    }
  };

  const openStudentProfile = async (student: any) => {
    setSelectedStudent(student);
    setStudentDetails(null);
    setStudentModalOpen(true);
    setLoadingStudentDetails(true);

    // Fetch this student's attendance
    const { data: attData } = await supabase.from('attendance_records').select('*').eq('student_id', student.id);
    // Fetch all attendance to compute rank
    const { data: allAtt } = await supabase.from('attendance_records').select('student_id, status');
    // Fetch this student's submissions
    const { data: subsData } = await supabase.from('assignment_submissions').select('*').eq('student_id', student.id);
    // Fetch all submissions for rank calc
    const { data: allSubs } = await supabase.from('assignment_submissions').select('student_id, score');

    // Per-student attendance map
    const attMap: Record<string, { present: number; total: number }> = {};
    (allAtt || []).forEach((r: any) => {
      if (!attMap[r.student_id]) attMap[r.student_id] = { present: 0, total: 0 };
      attMap[r.student_id].total++;
      if (r.status === 'present') attMap[r.student_id].present++;
    });

    // Per-student submission count
    const subMap: Record<string, number> = {};
    (allSubs || []).forEach((s: any) => {
      subMap[s.student_id] = (subMap[s.student_id] || 0) + 1;
    });

    // Calculate composite score for each student in DB
    const totalAssignments = assignments.length || 1;
    const scoreFor = (id: string) => {
      const a = attMap[id] || { present: 0, total: 0 };
      const attPct = a.total > 0 ? (a.present / a.total) * 100 : 0;
      const subPct = ((subMap[id] || 0) / totalAssignments) * 100;
      return attPct * 0.5 + subPct * 0.5;
    };

    const sortedIds = students.map(s => s.id).sort((a, b) => scoreFor(b) - scoreFor(a));
    const rank = sortedIds.indexOf(student.id) + 1;

    // This student's stats
    const myAtt = attData || [];
    const presentCount = myAtt.filter((r: any) => r.status === 'present').length;
    const totalClasses = myAtt.length;
    const attPct = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

    const submissions = subsData || [];
    const gradedSubs = submissions.filter((s: any) => s.score != null);
    const avgScore = gradedSubs.length > 0 ? gradedSubs.reduce((sum: number, s: any) => sum + s.score, 0) / gradedSubs.length : null;
    const cgpa = avgScore != null ? ((avgScore / 100) * 10).toFixed(1) : 'N/A';

    setStudentDetails({
      attendance: { present: presentCount, total: totalClasses, pct: attPct },
      submittedCount: submissions.length,
      pendingCount: Math.max(0, assignments.length - submissions.length),
      cgpa,
      rank,
      totalStudents: students.length,
    });
    setLoadingStudentDetails(false);
  };

  const handleSaveMarks = async () => {
    if (!marksForm.student_id) { alert("Please select a student."); return; }
    setIsSavingMarks(true);
    const { data: { session } } = await supabase.auth.getSession();
    const subject = teacherProfile?.subject || "Subject";
    const { error } = await supabase.from('student_marks').upsert({
      teacher_id: session?.user?.id,
      student_id: marksForm.student_id,
      student_name: marksForm.student_name,
      subject,
      cycle_test_1: marksForm.cycle_test_1 ? parseInt(marksForm.cycle_test_1) : null,
      cycle_test_2: marksForm.cycle_test_2 ? parseInt(marksForm.cycle_test_2) : null,
      term_grade: marksForm.term_grade || null,
      cgpa: marksForm.cgpa ? parseFloat(marksForm.cgpa) : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id,subject' });
    setIsSavingMarks(false);
    if (!error) {
      alert(`Marks saved for ${marksForm.student_name}!`);
      setMarksForm({ student_id: "", student_name: "", cycle_test_1: "", cycle_test_2: "", term_grade: "", cgpa: "" });
      const { data: marksData } = await supabase.from('student_marks').select('*').eq('teacher_id', session?.user?.id);
      if (marksData) setExistingMarks(marksData);
    } else { alert(error.message); }
  };

  // Algorithm to deduce global timetable
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const periods = ["09:00 - 10:00", "10:00 - 11:00", "11:15 - 12:15", "01:00 - 02:00", "02:00 - 03:00"];

  const getTeacherForSlot = (dayIndex: number, periodIndex: number) => {
    if (teachers.length === 0) return null;
    // Weekends usually have fewer classes or no classes, but for the algorithm we will scatter them
    if (dayIndex >= 5 && periodIndex > 2) return null; 
    const index = (dayIndex * periods.length + periodIndex) % teachers.length;
    return teachers[index];
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading Faculty Dashboard...</div>;

  const totalStudents = students.length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome, {teacherProfile?.name || "Professor"} 👋</h2>
          <p className="text-muted-foreground mt-1 text-lg">Manage {teacherProfile?.subject ? `your ${teacherProfile.subject}` : 'your'} curriculum, students, and timetable seamlessly.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsMaterialModalOpen(true)} className="border-primary/20 hover:bg-primary/5">
            <Upload className="h-4 w-4 mr-2" /> Upload Material
          </Button>
          <Button onClick={() => setIsAssignmentModalOpen(true)} className="shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4 mr-2" /> Create Assignment
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-all border-border/50 bg-background/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1 text-green-500 flex items-center">
              Active in DataBase
            </p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-all border-border/50 bg-background/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{assignments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Assignments tracking</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-border/50 bg-background/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Student CGPA</CardTitle>
            <Activity className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">8.4</div>
            <p className="text-xs text-muted-foreground mt-1 text-green-500 flex items-center">
              +0.2 from last semester
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-border/50 bg-background/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1 text-destructive/80">
              Absence Requests
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4 border-border/50 bg-background/50 backdrop-blur-sm shadow-sm">
              <CardHeader>
                <CardTitle>Class Performance Analytics</CardTitle>
                <CardDescription>Average scores across recent graded materials in {teacherProfile?.subject || 'your subjects'}.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classPerformance} maxBarSize={40}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tickMargin={12} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: 8, border: '1px solid hsl(var(--border))' }}/>
                    <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 border-border/50 bg-background/50 backdrop-blur-sm shadow-sm flex flex-col">
              <CardHeader>
                <CardTitle>Needs Attention</CardTitle>
                <CardDescription>Students falling behind or missing work.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                {students.slice(0, 3).map((student, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.3 }}
                    key={student.id || i} 
                    className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-bold">
                        {student.name ? student.name.substring(0, 2).toUpperCase() : "NA"}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{student.name || "Student"}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-destructive" /> Missing assignments
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-primary hover:text-primary">
                      Ping
                    </Button>
                  </motion.div>
                ))}
                {students.length === 0 && (
                  <div className="text-sm text-center text-muted-foreground p-4">No students populate the database yet.</div>
                )}
                <div className="mt-auto pt-4">
                  <Button variant="outline" className="w-full text-xs hover:bg-background">View Complete Risk List</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assignments">
           <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Manage Assignments</CardTitle>
                <CardDescription>Published tasks synced real-time from Supabase.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsAssignmentModalOpen(true)}><Plus className="w-4 h-4 mr-1"/> New</Button>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/10">No assignments created yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Difficulty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">{assignment.title}</TableCell>
                        <TableCell className="text-muted-foreground">{assignment.subject}</TableCell>
                        <TableCell className="text-muted-foreground flex items-center gap-1.5 whitespace-nowrap pt-4"><Clock className="w-3 h-3"/> {new Date(assignment.due_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{assignment.difficulty}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

           <Card className="border-border/50 shadow-sm mt-8">
            <CardHeader>
              <CardTitle>Pending Submissions</CardTitle>
              <CardDescription>Review and approve hand-ins sent by your students.</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingSubmissions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/10">No pending submissions right now.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Turned In</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingSubmissions.map((sub, i) => (
                      <TableRow key={sub.id || i}>
                        <TableCell className="font-medium">{sub.student_name}</TableCell>
                        <TableCell className="text-muted-foreground">{sub.assignment_title}</TableCell>
                        <TableCell className="text-muted-foreground"><Clock className="w-3 h-3 inline mr-1"/> {new Date(sub.created_at || new Date()).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                             {sub.file_url && (
                               <Button size="sm" variant="outline" className="text-secondary" onClick={() => window.open(sub.file_url, '_blank')}><Eye className="w-3 h-3 mr-1"/> View Work</Button>
                             )}
                             <Button size="sm" variant="default" className="bg-primary" onClick={() => handleApproveSubmission(sub.student_id, sub.assignment_id)}><CheckSquare className="w-3 h-3 mr-1"/> Approve</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials">
           <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Course Materials</CardTitle>
                <CardDescription>Published resources for your students.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsMaterialModalOpen(true)}><Upload className="w-4 h-4 mr-1"/> Upload</Button>
            </CardHeader>
            <CardContent>
              {materials.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/10">No materials uploaded yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Added On</TableHead>
                      <TableHead className="text-right">Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((mat) => (
                      <TableRow key={mat.id}>
                        <TableCell className="font-medium">{mat.title}</TableCell>
                        <TableCell className="text-muted-foreground">{mat.subject}</TableCell>
                        <TableCell className="text-muted-foreground flex items-center gap-1.5 whitespace-nowrap pt-4"><Clock className="w-3 h-3"/> {new Date(mat.created_at || new Date()).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="text-xs border-primary/30 text-primary h-7" onClick={() => window.open(mat.link, '_blank')}><LinkIcon className="w-3 h-3 mr-1"/> View</Button>
                        </TableCell>
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
              <CardTitle>Today's Attendance Registry</CardTitle>
              <CardDescription>Live real-time student tracking for your active class.</CardDescription>
            </CardHeader>
            <CardContent>
              {!attendanceLocked ? (
                <div className="mb-6 p-4 border rounded-xl bg-muted/20 space-y-4">
                  <h3 className="font-semibold text-lg flex items-center"><Calendar className="w-5 h-5 mr-2 text-primary" /> Start Attendance Session</h3>
                  <p className="text-sm text-muted-foreground">Please configure the exact date and time for this attendance record before marking.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="space-y-2">
                       <Label>Day</Label>
                       <select 
                         className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                         value={attendanceConfig.day}
                         onChange={(e) => setAttendanceConfig({...attendanceConfig, day: e.target.value})}
                       >
                         <option value="">Select Day</option>
                         <option value="Monday">Monday</option>
                         <option value="Tuesday">Tuesday</option>
                         <option value="Wednesday">Wednesday</option>
                         <option value="Thursday">Thursday</option>
                         <option value="Friday">Friday</option>
                         <option value="Saturday">Saturday</option>
                         <option value="Sunday">Sunday</option>
                       </select>
                     </div>
                     <div className="space-y-2">
                       <Label>Date</Label>
                       <Input type="date" value={attendanceConfig.date} onChange={(e) => setAttendanceConfig({...attendanceConfig, date: e.target.value})} />
                     </div>
                     <div className="space-y-2">
                       <Label>Time</Label>
                       <Input type="time" value={attendanceConfig.time} onChange={(e) => setAttendanceConfig({...attendanceConfig, time: e.target.value})} />
                     </div>
                  </div>
                  <Button 
                     onClick={() => {
                       if (!attendanceConfig.day || !attendanceConfig.date || !attendanceConfig.time) {
                         alert("Please fill all day, date, and time fields.");
                         return;
                       }
                       setAttendanceLocked(true);
                     }}
                  >
                    Lock Session & Start Marking
                  </Button>
                </div>
              ) : (
                <div className="mb-6 p-4 border-green-500/30 border bg-green-500/5 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-600">Session Active</p>
                    <p className="text-xs text-muted-foreground">Marking attendance for {attendanceConfig.day}, {attendanceConfig.date} at {attendanceConfig.time}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setAttendanceLocked(false)}>Change Details</Button>
                </div>
              )}

              {students.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/20">No students are currently registered in the database. When students log in and complete setup, they will appear here dynamically.</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-[120px]">Roll No.</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Reg. Number</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.rollno}</TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{student.registration_no}</TableCell>
                          <TableCell className="text-right space-x-2 whitespace-nowrap">
                             <Button size="sm" variant="outline" onClick={() => openStudentProfile(student)} className="border-primary/30 text-primary h-7 mr-1"><Eye className="w-3 h-3 mr-1"/>View</Button>
                             <Button size="sm" variant="secondary" disabled={!attendanceLocked} onClick={() => markAttendance(student.id, student.name, 'present')} className="bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-600 border border-green-500/20 disabled:opacity-50">Present</Button>
                             <Button size="sm" variant="secondary" disabled={!attendanceLocked} onClick={() => markAttendance(student.id, student.name, 'absent')} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600 border border-red-500/20 disabled:opacity-50">Absent</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timetable">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle>Your Weekly Roster</CardTitle>
                <CardDescription>7-Day Schedule. Only displaying assigned slots for {teacherProfile?.subject || 'your subject'}.</CardDescription>
              </div>
              <Badge className="bg-primary text-primary-foreground">{teacherProfile?.subject || 'Faculty'}</Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="min-w-[120px] font-bold">Time</TableHead>
                    {days.map(day => <TableHead key={day} className="text-center font-bold min-w-[100px]">{day}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((period, periodIndex) => (
                    <TableRow key={period}>
                      <TableCell className="font-medium text-xs bg-muted/10 border-r whitespace-nowrap">{period}</TableCell>
                      {days.map((day, dayIndex) => {
                        const slotTeacher = getTeacherForSlot(dayIndex, periodIndex);
                        
                        // Check if this slot belongs to the logic map of the current logged in teacher
                        // We check by strict name matching or subject matching to isolate THEIR slots
                        const isMyClass = slotTeacher && (slotTeacher.name === teacherProfile?.name || slotTeacher.subject === teacherProfile?.subject);
                        
                        return (
                          <TableCell key={day} className={`text-center transition-colors p-3 border-l border-border/30 ${isMyClass ? 'bg-primary/10 border-primary/40' : 'bg-muted/5'}`}>
                            {isMyClass ? (
                              <div className="flex flex-col items-center justify-center">
                                <span className="font-bold text-primary flex items-center gap-1"><BookOpen className="w-3 h-3"/> {slotTeacher.subject}</span>
                                <span className="text-[10px] text-muted-foreground font-semibold mt-1 bg-background/50 px-2 py-0.5 rounded-full border border-primary/20">Class assigned</span>
                              </div>
                            ) : (
                               <div className="text-muted-foreground/30 text-xs italic opacity-50">-</div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meets">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-3 border-border/50 shadow-sm">
              <CardHeader className="bg-muted/10 border-b border-border/50">
                <CardTitle>Schedule Proctor Meet</CardTitle>
                <CardDescription>Invite students for specific 1-1 or group video sessions.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Target Participant</Label>
                  <select 
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={meetForm.student_email}
                    onChange={(e) => setMeetForm({...meetForm, student_email: e.target.value})}
                  >
                    <option value="all">Entire Class / All Students</option>
                    {students.map(s => <option key={s.id} value={s.email}>{s.name} ({s.rollno})</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Topic / Agenda</Label>
                  <Input placeholder="e.g. Midterm Grades Discussion" value={meetForm.topic} onChange={(e) => setMeetForm({...meetForm, topic: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={meetForm.date} onChange={(e) => setMeetForm({...meetForm, date: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input type="time" value={meetForm.time} onChange={(e) => setMeetForm({...meetForm, time: e.target.value})} />
                  </div>
                </div>
                <Button onClick={handleScheduleMeet} disabled={isScheduling} className="w-full mt-2">
                  {isScheduling ? "Publishing..." : "Publish Meet Invitation"}
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-4 border-border/50 shadow-sm flex flex-col">
              <CardHeader className="bg-muted/10 border-b border-border/50">
                <CardTitle>Scheduled Meets</CardTitle>
                <CardDescription>Upcoming proctoring and 1-on-1 sessions you've hosted.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-y-auto">
                {meets.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">You have no upcoming meets scheduled.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/5">
                        <TableHead>Topic</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead className="text-right">Status / Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {meets.map(meet => (
                        <TableRow key={meet.id}>
                          <TableCell className="font-medium text-sm">{meet.topic}</TableCell>
                          <TableCell>
                             <Badge variant="outline" className={meet.student_email === 'all' ? 'border-primary/50 text-primary' : 'border-blue-500/50 text-blue-500'}>
                                {meet.student_email === 'all' ? 'All Class' : "1-on-1"}
                             </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground flex items-center gap-1.5 pt-4">
                            <Clock className="w-3 h-3" /> {new Date(meet.meeting_time).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short'})}
                          </TableCell>
                          <TableCell className="text-right">
                             {meet.status === 'happened' ? (
                               <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20 w-[70px] justify-center">Happened</Badge>
                             ) : meet.status === 'failed' ? (
                               <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 w-[70px] justify-center">Failed</Badge>
                             ) : (
                               <div className="flex items-center justify-end gap-2">
                                 <Button size="sm" variant="outline" className="h-7 text-xs border-green-500/50 text-green-600 hover:bg-green-500/10" onClick={() => handleMeetStatusUpdate(meet.id, 'happened')}>Happened</Button>
                                 <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/50 text-red-600 hover:bg-red-500/10" onClick={() => handleMeetStatusUpdate(meet.id, 'failed')}>Failed</Button>
                               </div>
                             )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="marks">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            {/* Entry Form */}
            <Card className="lg:col-span-3 border-border/50 shadow-sm">
              <CardHeader className="bg-muted/10 border-b border-border/50">
                <CardTitle>Enter Student Marks</CardTitle>
                <CardDescription>Subject: <span className="text-primary font-semibold">{teacherProfile?.subject || 'Your Subject'}</span></CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Select Student</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={marksForm.student_id}
                    onChange={(e) => {
                      const s = students.find(st => st.id === e.target.value);
                      setMarksForm({ ...marksForm, student_id: e.target.value, student_name: s?.name || "" });
                    }}
                  >
                    <option value="">— Select a student —</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.rollno})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cycle Test 1 <span className="text-muted-foreground text-xs">(/ 100)</span></Label>
                    <Input type="number" min={0} max={100} placeholder="e.g. 88" value={marksForm.cycle_test_1} onChange={(e) => setMarksForm({ ...marksForm, cycle_test_1: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cycle Test 2 <span className="text-muted-foreground text-xs">(/ 100)</span></Label>
                    <Input type="number" min={0} max={100} placeholder="e.g. 92" value={marksForm.cycle_test_2} onChange={(e) => setMarksForm({ ...marksForm, cycle_test_2: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Term Grade</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={marksForm.term_grade}
                      onChange={(e) => setMarksForm({ ...marksForm, term_grade: e.target.value })}
                    >
                      <option value="">— Grade —</option>
                      {["O", "A+", "A", "B+", "B", "C", "F"].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>CGPA <span className="text-muted-foreground text-xs">(0–10)</span></Label>
                    <Input type="number" min={0} max={10} step={0.1} placeholder="e.g. 9.0" value={marksForm.cgpa} onChange={(e) => setMarksForm({ ...marksForm, cgpa: e.target.value })} />
                  </div>
                </div>
                <Button onClick={handleSaveMarks} disabled={isSavingMarks} className="w-full mt-2">
                  {isSavingMarks ? "Saving..." : "Save / Update Marks"}
                </Button>
              </CardContent>
            </Card>

            {/* Saved Marks Table */}
            <Card className="lg:col-span-4 border-border/50 shadow-sm flex flex-col">
              <CardHeader className="bg-muted/10 border-b border-border/50">
                <CardTitle>Marks Record — {teacherProfile?.subject}</CardTitle>
                <CardDescription>All marks you have entered for your subject.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-y-auto">
                {existingMarks.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No marks entered yet. Use the form to add grades.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/5">
                        <TableHead>Student</TableHead>
                        <TableHead className="text-center">CT1</TableHead>
                        <TableHead className="text-center">CT2</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                        <TableHead className="text-right">CGPA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {existingMarks.map(m => {
                        const gradeColor = m.term_grade === 'O' || m.term_grade === 'A+' ? 'text-green-500' : m.term_grade === 'A' || m.term_grade === 'B+' ? 'text-primary' : m.term_grade === 'F' ? 'text-destructive' : '';
                        return (
                          <TableRow key={m.id}>
                            <TableCell>
                              <div className="font-medium text-sm">{m.student_name}</div>
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">{m.cycle_test_1 ?? '—'}/100</TableCell>
                            <TableCell className="text-center text-muted-foreground">{m.cycle_test_2 ?? '—'}/100</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={`${gradeColor} border-current/30`}>{m.term_grade || '—'}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-500">{m.cgpa ?? '—'}</TableCell>
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

      </Tabs>

      {/* Student Profile Modal */}
      <Dialog open={studentModalOpen} onOpenChange={setStudentModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                {selectedStudent?.name?.substring(0, 2).toUpperCase() || "NA"}
              </div>
              {selectedStudent?.name}
            </DialogTitle>
            <DialogDescription>{selectedStudent?.rollno} · {selectedStudent?.registration_no}</DialogDescription>
          </DialogHeader>
          {loadingStudentDetails ? (
            <div className="py-10 text-center text-muted-foreground animate-pulse">Fetching student data...</div>
          ) : studentDetails && (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-border/50 rounded-xl p-4 text-center bg-muted/10">
                  <div className="text-2xl font-bold text-primary">{studentDetails.cgpa}</div>
                  <div className="text-xs text-muted-foreground mt-1">CGPA</div>
                </div>
                <div className="border border-border/50 rounded-xl p-4 text-center bg-muted/10">
                  <div className="text-2xl font-bold flex items-center justify-center gap-1">
                    <Trophy className="w-5 h-5 text-yellow-500" />#{studentDetails.rank}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Class Rank of {studentDetails.totalStudents}</div>
                </div>
                <div className="border border-border/50 rounded-xl p-4 text-center bg-muted/10">
                  <div className={`text-2xl font-bold ${studentDetails.attendance.pct < 75 ? 'text-destructive' : 'text-green-500'}`}>
                    {studentDetails.attendance.pct}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Attendance</div>
                  <div className="text-[11px] text-muted-foreground">{studentDetails.attendance.present}/{studentDetails.attendance.total} classes</div>
                </div>
                <div className="border border-border/50 rounded-xl p-4 text-center bg-muted/10">
                  <div className="text-2xl font-bold text-blue-500">{studentDetails.submittedCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">Submitted</div>
                  <div className="text-[11px] text-muted-foreground">{studentDetails.pendingCount} pending</div>
                </div>
              </div>
              <div className="border border-border/50 rounded-xl p-4 space-y-2.5 bg-muted/5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Assignments Given</span>
                  <span className="font-medium">{assignments.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Assignments Submitted</span>
                  <span className="font-medium text-green-500">{studentDetails.submittedCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pending Submissions</span>
                  <span className={`font-medium ${studentDetails.pendingCount > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`}>{studentDetails.pendingCount}</span>
                </div>
                <div className="h-px bg-border/50 my-1" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Attendance Status</span>
                  <Badge variant="outline" className={studentDetails.attendance.pct < 75 ? 'border-destructive/50 text-destructive' : 'border-green-500/50 text-green-500'}>
                    {studentDetails.attendance.pct < 75 ? 'Below Limit' : studentDetails.attendance.pct >= 90 ? 'Excellent' : 'Good'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Material Modal */}
      <Dialog open={isMaterialModalOpen} onOpenChange={setIsMaterialModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Course Material</DialogTitle>
            <DialogDescription>Attach any syllabus, PPTs, or PDF from your system directly into the materials board.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Material Title</Label>
              <Input placeholder="e.g. Chapter 1 PDF" value={materialTitle} onChange={(e) => setMaterialTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Select File</Label>
              <Input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
            </div>
            <Button className="w-full mt-4" onClick={handleUploadMaterialSubmit} disabled={isUploading}>
               {isUploading ? "Uploading..." : "Upload Material"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Assignment Modal */}
      <Dialog open={isAssignmentModalOpen} onOpenChange={setIsAssignmentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
            <DialogDescription>Define strict deadlines and securely attach reference documents for hand-ins.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Assignment Title</Label>
              <Input placeholder="e.g. React Hooks Project" value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date Given</Label>
                <Input type="date" value={assignmentGivenDate} onChange={(e) => setAssignmentGivenDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input type="date" value={assignmentDeadline} onChange={(e) => setAssignmentDeadline(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Attach Question/File (Optional)</Label>
              <Input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
            </div>
            <Button className="w-full mt-4" onClick={handleCreateAssignmentSubmit} disabled={isUploading}>
               {isUploading ? "Deploying Assignment..." : "Publish Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default function TeacherDashboard() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-muted-foreground animate-pulse">Loading Faculty Dashboard...</div>}>
      <TeacherDashboardContent />
    </Suspense>
  )
}
