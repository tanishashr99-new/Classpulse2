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
            .select("date, status")
            .eq("student_id", student.id);

          if (!attendanceDocs || attendanceDocs.length === 0) {

            setLoading(false);
            return;
          }



          const grouped: Record<string, { present: number; absent: number }> = {};
          attendanceDocs.forEach((rec) => {
            const dateKey = String(rec.date).split("T")[0];
            if (!grouped[dateKey]) grouped[dateKey] = { present: 0, absent: 0 };
            if (rec.status?.toLowerCase() === "present") grouped[dateKey].present++;
            else grouped[dateKey].absent++;
          });

          const processedRecords: Record<string, DayStatus> = {};
          let totalPresent = 0;
          let totalAbsent = 0;

          Object.entries(grouped).forEach(([date, counts]) => {
            const finalStatus = counts.present >= counts.absent ? "present" : "absent";
            processedRecords[date] = finalStatus;
            if (finalStatus === "present") totalPresent++;
            else totalAbsent++;
          });

          setRecords(processedRecords);
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
    </div>
  );
}
