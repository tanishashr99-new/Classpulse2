"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Suspense } from "react";
import {
  BookOpen,
  LayoutDashboard,
  FileText,
  Users,
  BarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  LogOut,
  Video,
  Map,
  Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  role: "student" | "teacher";
}

const teacherLinks = [
  { name: "Dashboard", href: "/teacher?tab=overview", match: "overview", icon: LayoutDashboard },
  { name: "Assignments", href: "/teacher?tab=assignments", match: "assignments", icon: FileText },
  { name: "Materials", href: "/teacher?tab=materials", match: "materials", icon: BookOpen },
  { name: "Attendance", href: "/teacher?tab=attendance", match: "attendance", icon: Users },
  { name: "Marks", href: "/teacher?tab=marks", match: "marks", icon: BarChart },
  { name: "Timetable", href: "/teacher?tab=timetable", match: "timetable", icon: BookOpen },
  { name: "Proctor Meets", href: "/teacher?tab=meets", match: "meets", icon: Video },
];

const studentLinks = [
  { name: "Dashboard", href: "/student?tab=overview", match: "/student?tab=overview", exact: true },
  { name: "Assignments", href: "/student?tab=assignments", match: "/student?tab=assignments" },
  { name: "Materials", href: "/student?tab=materials", match: "/student?tab=materials" },
  { name: "Progress", href: "/student?tab=attendance", match: "/student?tab=attendance" },
  { name: "Proctor Meets", href: "/student?tab=meets", match: "/student?tab=meets" },
];

function SidebarContent({ role }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  
  // Re-map student links to include icons since we had to add match objects
  const finalStudentLinks = [
    { name: "Dashboard", href: "/student?tab=overview", match: "overview", icon: LayoutDashboard },
    { name: "Timetable", href: "/student?tab=timetable", match: "timetable", icon: BookOpen },
    { name: "Attendance", href: "/student?tab=attendance", match: "attendance", icon: Users },
    { name: "Assignments", href: "/student?tab=assignments", match: "assignments", icon: FileText },
    { name: "Materials", href: "/student?tab=materials", match: "materials", icon: BookOpen },
    { name: "Progress", href: "/student?tab=progress", match: "progress", icon: BarChart },
    { name: "Roadmap", href: "/student?tab=roadmap", match: "roadmap", icon: Map },
    { name: "Proctor Meets", href: "/student?tab=meets", match: "meets", icon: Video },
    { name: "Leaderboard", href: "/student?tab=leaderboard", match: "leaderboard", icon: Trophy },
  ];
  
  const links = role === "teacher" ? teacherLinks : finalStudentLinks;

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="h-screen bg-card border-r border-border/50 sticky top-0 flex flex-col z-20 shadow-sm"
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-border/50 relative">
        <Link href="/" className="flex items-center gap-2 overflow-hidden">
          <div className="bg-primary/10 p-1.5 rounded-lg flex-shrink-0">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="font-bold text-lg whitespace-nowrap tracking-tight text-primary"
              >
                ClassPulse
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full border border-border bg-background shadow-md hidden md:flex"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-2 px-3">
        <div className="mb-2 px-2">
          {!isCollapsed && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Main Menu</p>}
        </div>
        {links.map((link) => {
          let isActive = false;
          if (role === 'student' && pathname === '/student') {
            const currentTab = tab || 'overview';
            isActive = 'match' in link && link.match === currentTab;
          } else if (role === 'teacher' && pathname === '/teacher') {
            const currentTab = tab || 'overview';
            isActive = 'match' in link && link.match === currentTab;
          } else {
             isActive = pathname === link.href;
          }
          return (
            <Link key={link.name} href={link.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group overflow-hidden",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <link.icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
                {!isCollapsed && (
                  <span className="font-medium whitespace-nowrap">{link.name}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border/50 space-y-2">
        <Link href={`/${role}/settings`}>
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all group">
            <Settings className="h-5 w-5 flex-shrink-0 group-hover:text-primary" />
            {!isCollapsed && <span className="font-medium">Settings</span>}
          </div>
        </Link>
        <Link href="/login" onClick={() => supabase.auth.signOut()}>
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-destructive hover:bg-destructive/10 transition-all group cursor-pointer">
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium">Logout</span>}
          </div>
        </Link>
      </div>
    </motion.aside>
  );
}

import { supabase } from "@/lib/supabase";

export function Sidebar({ role }: SidebarProps) {
  return (
    <Suspense fallback={<div className="w-64 h-screen bg-card border-r border-border/50 sticky top-0" />}>
      <SidebarContent role={role} />
    </Suspense>
  )
}
