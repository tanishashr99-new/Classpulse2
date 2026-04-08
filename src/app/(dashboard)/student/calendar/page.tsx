"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, XCircle, BarChart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

type DayStatus = "present" | "absent" | "none";

export default function AttendanceCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<Record<string, DayStatus>>({});
  const [stats, setStats] = useState({ present: 0, absent: 0, percentage: 0 });
  const [subjectStats, setSubjectStats] = useState<Record<string, { present: number; total: number; percentage: number }>>({});
  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [dayWiseAttendance, setDayWiseAttendance] = useState<{
    date: string;
    formattedDate: string;
    subjects: Record<string, "Present" | "Absent" | "No class">;
    attended: number;
    total: number;
  }[]>([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const user = session.user;
          
          const { data: student } = await supabase
            .from("students")
            .select("id")
            .eq("email", user.email)
            .single();

          if (!student) {
            setLoading(false);
            return;
          }

          // 3. Parallel fetch: All possible subjects from teachers + specific attendance records
          const [teacherRes, attendanceRes] = await Promise.all([
            supabase.from("teachers").select("subject"),
            supabase.from("attendance_records")
              .select("date, status, subject")
              .eq("student_id", student.id)
          ]);

          const teacherData = teacherRes.data;
          const attendanceDocs = attendanceRes.data;

          if (!attendanceDocs) {
            setLoading(false);
            return;
          }

          const subjectsList = Array.from(new Set((teacherData || []).map(t => t.subject).filter(Boolean)));
          setAllSubjects(subjectsList);

          // Group by date for calendar markers
          const groupedByDate: Record<string, { present: number; absent: number }> = {};
          
          // Initialize subject stats with all subjects from the system
          const groupedBySubject: Record<string, { present: number; total: number }> = {};
          subjectsList.forEach(sub => {
            groupedBySubject[sub] = { present: 0, total: 0 };
          });

          // Day-wise processing map
          const dailyMap: Record<string, Record<string, "Present" | "Absent" | "No class">> = {};

          attendanceDocs.forEach((rec) => {
            // Calendar processing
            const dateKey = String(rec.date).split("T")[0];
            if (!groupedByDate[dateKey]) groupedByDate[dateKey] = { present: 0, absent: 0 };
            if (rec.status?.toLowerCase() === "present") groupedByDate[dateKey].present++;
            else groupedByDate[dateKey].absent++;

            // Subject processing (Master Statistics)
            const sub = rec.subject;
            if (sub) {
              if (!groupedBySubject[sub]) groupedBySubject[sub] = { present: 0, total: 0 };
              groupedBySubject[sub].total++;
              if (rec.status?.toLowerCase() === "present") groupedBySubject[sub].present++;
              
              // Daily map processing
              if (!dailyMap[dateKey]) {
                dailyMap[dateKey] = {};
                subjectsList.forEach(s => dailyMap[dateKey][s] = "No class");
              }
              dailyMap[dateKey][sub] = (rec.status?.toLowerCase() === "present" ? "Present" : "Absent");
            }
          });

          // Process records for calendar state
          const processedRecords: Record<string, DayStatus> = {};
          let totalPresent = 0;
          let totalAbsent = 0;

          Object.entries(groupedByDate).forEach(([date, counts]) => {
            const finalStatus = counts.present >= counts.absent ? "present" : "absent";
            processedRecords[date] = finalStatus;
            if (finalStatus === "present") totalPresent++;
            else totalAbsent++;
          });

          // Process subject stats
          const finalSubjectStats: Record<string, { present: number; total: number; percentage: number }> = {};
          Object.entries(groupedBySubject).forEach(([sub, data]) => {
            finalSubjectStats[sub] = {
              ...data,
              percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0
            };
          });

          // Process day-wise attendance
          const sortedDays = Object.entries(dailyMap).map(([date, subs]) => {
            const d = new Date(date);
            const formattedDate = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + " \u2014 " + d.toLocaleDateString('en-US', { weekday: 'long' });
            
            let attended = 0;
            let scheduled = 0;
            Object.values(subs).forEach(status => {
                if (status !== "No class") scheduled++;
                if (status === "Present") attended++;
            });

            return {
                date,
                formattedDate,
                subjects: subs,
                attended,
                total: scheduled
            };
          }).sort((a,b) => b.date.localeCompare(a.date));

          setRecords(processedRecords);
          setSubjectStats(finalSubjectStats);
          setDayWiseAttendance(sortedDays);
          setStats({
            present: totalPresent,
            absent: totalAbsent,
            percentage: totalPresent + totalAbsent > 0
              ? Math.round((totalPresent / (totalPresent + totalAbsent)) * 100)
              : 0
          });
          setLoading(false);
        } else {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDayOfMonth = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const monthName = currentDate.toLocaleString("default", { month: "long" });
  const year = currentDate.getFullYear();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const hasLowAttendance = Object.values(subjectStats).some(s => s.percentage < 75);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Attendance Calendar</h1>
        <p className="text-muted-foreground">Track your monthly attendance status and statistics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <BarChart className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
            <h3 className="text-2xl font-bold">{stats.percentage}%</h3>
          </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Present</p>
            <h3 className="text-2xl font-bold text-emerald-600">{stats.present}</h3>
          </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
            <XCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Absent</p>
            <h3 className="text-2xl font-bold text-rose-600">{stats.absent}</h3>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <CalendarIcon className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">{monthName} {year}</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-muted rounded-lg transition-colors border border-border/50">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-muted rounded-lg transition-colors border border-border/50">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="h-[400px] flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="text-muted-foreground animate-pulse">Fetching your attendance data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2 text-center">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => (
                <div key={day} className="text-xs font-semibold text-muted-foreground py-2 uppercase">{day}</div>
              ))}
              {days.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} className="aspect-square" />;
                const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const status = records[dateStr] || "none";
                return (
                  <div key={day} className={cn(
                    "aspect-square rounded-xl flex flex-col items-center justify-center border transition-all",
                    status === "present" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-700",
                    status === "absent" && "bg-rose-500/10 border-rose-500/20 text-rose-700",
                    status === "none" && "bg-muted/30 border-border/50 text-muted-foreground/60"
                  )}>
                    <span className="text-lg font-bold">{day}</span>
                    <div className={cn(
                      "w-2/3 h-1.5 rounded-full mt-1",
                      status === "present" && "bg-emerald-500",
                      status === "absent" && "bg-rose-500",
                      status === "none" && "bg-muted-foreground/10"
                    )} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-muted/5 border-t border-border/50 flex gap-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
            <div className="w-3 h-3 rounded-full bg-emerald-500" /> Present
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-600">
            <div className="w-3 h-3 rounded-full bg-rose-500" /> Absent
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <div className="w-3 h-3 rounded-full bg-muted-foreground/30" /> No Record
          </div>
        </div>
      </div>

      {/* Subject-wise Attendance List */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border/50 bg-muted/5">
          <h2 className="text-xl font-bold">Subject-wise Attendance</h2>
        </div>
        <div className="p-6 space-y-6">
          {Object.entries(subjectStats).length > 0 ? (
            Object.entries(subjectStats).map(([subject, data]) => (
              <div key={subject} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="font-semibold text-lg">{subject}</h3>
                    <p className="text-sm text-muted-foreground">
                      Presence: <span className="font-medium text-foreground">{data.present}</span> / {data.total} classes
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "text-2xl font-bold",
                      data.percentage >= 75 ? "text-emerald-600" : data.percentage >= 50 ? "text-amber-600" : "text-rose-600"
                    )}>
                      {data.percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${data.percentage}%` }}
                    className={cn(
                      "h-full rounded-full transition-all",
                      data.percentage >= 75 ? "bg-emerald-500" : data.percentage >= 50 ? "bg-amber-500" : "bg-rose-500"
                    )}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">No subject records available.</p>
          )}

          {hasLowAttendance && (
            <div className="mt-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-700">
              <CheckCircle2 className="h-5 w-5 rotate-180" />
              <p className="text-sm font-medium">
                Warning: Your attendance in one or more subjects is below the required 75%. Please attend more classes to avoid eligibility issues.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Day-wise Attendance Section */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border/50 bg-muted/5 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Day-wise attendance</h2>
          </div>
          <p className="text-sm text-muted-foreground">All subjects per day</p>
        </div>
        
        <div className="divide-y divide-border/50">
          {dayWiseAttendance.length > 0 ? (
            dayWiseAttendance.map((day) => (
              <div key={day.date} className="p-6 space-y-4">
                <h3 className="font-semibold text-lg text-foreground">{day.formattedDate}</h3>
                
                <div className="flex flex-wrap gap-4">
                  {Object.entries(day.subjects).map(([subject, status]) => (
                    <div 
                      key={subject}
                      className={cn(
                        "min-w-[140px] flex-1 p-3 rounded-xl border-l-4 border shadow-sm transition-all",
                        status === "Present" && "bg-emerald-500/5 border-emerald-500/20 border-l-[#639922]",
                        status === "Absent" && "bg-rose-500/5 border-rose-500/20 border-l-[#E24B4A]",
                        status === "No class" && "bg-muted/10 border-border/50 border-l-muted-foreground/30"
                      )}
                    >
                      <h4 className="text-[13px] font-semibold text-foreground truncate mb-1">{subject}</h4>
                      <p className="text-[12px] text-muted-foreground mb-2">
                        {status === "No class" ? "0 / 0" : "1 / 1"} class
                      </p>
                      <span className={cn(
                        "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full inline-block",
                        status === "Present" && "bg-emerald-500/10 text-emerald-700",
                        status === "Absent" && "bg-rose-500/10 text-rose-700",
                        status === "No class" && "bg-muted text-muted-foreground/70"
                      )}>
                        {status}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50 mt-2">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Total classes attended that day</span>
                  <span className="text-lg font-bold text-foreground">{day.attended} / {day.total}</span>
                </div>
              </div>
            ))
          ) : (
             <p className="text-center text-muted-foreground py-12">No daily attendance records have been registered yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
