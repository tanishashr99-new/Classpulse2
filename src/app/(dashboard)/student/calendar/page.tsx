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

          const { data: attendanceDocs } = await supabase
            .from("attendance_records")
            .select("date, status, subject")
            .eq("student_id", student.id);

          if (!attendanceDocs || attendanceDocs.length === 0) {
            setLoading(false);
            return;
          }

          // Group by date for calendar markers
          const groupedByDate: Record<string, { present: number; absent: number }> = {};
          // Group by subject for the list below
          const groupedBySubject: Record<string, { present: number; total: number }> = {};

          attendanceDocs.forEach((rec) => {
            // Calendar processing
            const dateKey = String(rec.date).split("T")[0];
            if (!groupedByDate[dateKey]) groupedByDate[dateKey] = { present: 0, absent: 0 };
            if (rec.status?.toLowerCase() === "present") groupedByDate[dateKey].present++;
            else groupedByDate[dateKey].absent++;

            // Subject processing
            const sub = rec.subject || "Unknown Subject";
            if (!groupedBySubject[sub]) groupedBySubject[sub] = { present: 0, total: 0 };
            groupedBySubject[sub].total++;
            if (rec.status?.toLowerCase() === "present") groupedBySubject[sub].present++;
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
              percentage: Math.round((data.present / data.total) * 100)
            };
          });

          setRecords(processedRecords);
          setSubjectStats(finalSubjectStats);
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
    </div>
  );
}
