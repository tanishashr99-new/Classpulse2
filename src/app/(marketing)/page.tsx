"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, BookOpen, UserCheck, BarChart3, MessageSquare, CheckCircle2, LayoutDashboard, Users, FileText, Settings, Activity, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useTheme } from "next-themes";

const features = [
  {
    name: "Assignments",
    description: "Seamlessly create, distribute, and grade assignments with automated tracking and due date reminders.",
    icon: BookOpen,
  },
  {
    name: "Attendance",
    description: "One-click attendance tracking for daily classes, complete with comprehensive absent/present reports.",
    icon: UserCheck,
  },
  {
    name: "Analytics",
    description: "Deep insights into student performance with visual charts to identify learning trends securely.",
    icon: BarChart3,
  },
  {
    name: "Communication",
    description: "Real-time chat and announcements to keep the entire classroom connected and informed.",
    icon: MessageSquare,
  },
];

const steps = [
  {
    number: "01",
    title: "Create your account",
    description: "Sign up in seconds. Choose your role as a teacher or student and set up your profile.",
  },
  {
    number: "02",
    title: "Set up your classroom",
    description: "Create classes, invite students, and configure your course structure in minutes.",
  },
  {
    number: "03",
    title: "Manage & track",
    description: "Post assignments, take attendance, and monitor performance all from one elegant dashboard.",
  },
  {
    number: "04",
    title: "Analyze & improve",
    description: "Use real-time analytics to identify trends and elevate outcomes for every student.",
  },
];

export default function LandingPage() {
  const { resolvedTheme } = useTheme();
  const strokeColor = resolvedTheme === "light" ? "#000000" : "#ffffff";
  const [activeStudents, setActiveStudents] = useState(142);
  const [tasksCompleted, setTasksCompleted] = useState(89);
  const [systemUptime, setSystemUptime] = useState(99.9);
  const [activeSidebarIndex, setActiveSidebarIndex] = useState(0);
  const [isAutoCycling, setIsAutoCycling] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Simulate real-time dashboard data changes and sidebar cycling
  useEffect(() => {
    setIsMounted(true);
    // Numbers update
    const numInterval = setInterval(() => {
      setActiveStudents(prev => prev + (Math.random() > 0.5 ? 1 : -1));
      if (Math.random() > 0.7) setTasksCompleted(prev => prev + 1);
    }, 2500);

    // Sidebar cycle
    let sidebarInterval: ReturnType<typeof setInterval>;
    if (isAutoCycling) {
      sidebarInterval = setInterval(() => {
        setActiveSidebarIndex(prev => (prev + 1) % 5);
      }, 3000);
    }

    return () => {
      clearInterval(numInterval);
      if (sidebarInterval) clearInterval(sidebarInterval);
    };
  }, [isAutoCycling]);

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Students', icon: Users },
    { name: 'Assignments', icon: FileText },
    { name: 'Analytics', icon: Activity },
    { name: 'Settings', icon: Settings }
  ];

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
          <div className="absolute top-0 right-0 -mr-32 -mt-32 w-[600px] h-[600px] rounded-full bg-primary/20 blur-[100px] opacity-50 dark:opacity-30 mix-blend-multiply" />
          <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-[600px] h-[600px] rounded-full bg-primary/20 blur-[100px] opacity-50 dark:opacity-30 mix-blend-multiply" />
        </div>

        <div className="container mx-auto text-center max-w-4xl -mt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              ClassPulse v2.0 is now live
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
              Revolutionizing <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">Classroom Experience</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              The premium, all-in-one platform for modern educators and students. Manage assignments, track attendance, and analyze performance with an intelligent, elegant interface.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="rounded-full w-full sm:w-auto px-8 h-14 text-base shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40">
                  Start for free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#demo">
                <Button variant="outline" size="lg" className="rounded-full w-full sm:w-auto px-8 h-14 text-base">
                  View Demo
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Interactive Demo / Dashboard Preview */}
      <section id="demo" className="py-12 md:py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="rounded-2xl border border-border/50 bg-background/50 backdrop-blur-3xl shadow-2xl overflow-hidden shadow-primary/10"
          >
            <div className="h-12 border-b border-border/50 bg-muted/50 flex items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="ml-4 bg-background/50 rounded-md px-3 py-1 flex-1 max-w-md border border-border/50 flex items-center mx-auto absolute left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
                <BookOpen className="w-3 h-3 mr-2" /> classpulse.app/dashboard
              </div>
            </div>
            
            <div className="aspect-[16/9] w-full bg-card flex overflow-hidden">
              {/* Realistic Sidebar Auto-Cycling */}
              <div className="hidden md:flex w-64 border-r border-border/50 flex-col bg-muted/10">
                <div className="p-6 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 text-primary-foreground font-bold">C</div>
                  <span className="font-semibold tracking-tight">ClassPulse</span>
                </div>
                <div className="px-4 py-2 space-y-2 flex-1">
                  {sidebarItems.map((item, i) => {
                    const isActive = i === activeSidebarIndex;
                    return (
                      <div 
                        key={i} 
                        onClick={() => {
                          setActiveSidebarIndex(i);
                          setIsAutoCycling(false);
                        }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-300 cursor-pointer ${isActive ? 'bg-primary/10 text-primary font-medium scale-105 shadow-sm' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
                      >
                        <item.icon className={`w-4 h-4 transition-colors duration-300 ${isActive ? 'text-primary' : ''}`} />
                        {item.name}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Realistic Content - Real-Time Dashboard */}
              <div className="flex-1 p-6 flex flex-col gap-6 bg-gradient-to-br from-background to-muted/20 relative">
                {/* We render content based on active tab to make it look like it's changing pages */}
                <div className="flex items-center justify-between">
                  <div>
                     <motion.h3 
                       key={sidebarItems[activeSidebarIndex].name}
                       initial={{ opacity: 0, x: -10 }}
                       animate={{ opacity: 1, x: 0 }}
                       className="font-bold text-xl tracking-tight"
                     >
                       {sidebarItems[activeSidebarIndex].name}
                     </motion.h3>
                     <p className="text-sm text-muted-foreground flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live Real-Time Activity</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full border border-border/50">
                     <Clock className="w-3 h-3 animate-spin duration-3000" /> Auto-sync enabled
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSidebarIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 flex flex-col gap-6"
                  >
                    {activeSidebarIndex === 0 && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm relative overflow-hidden group">
                             <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                             <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-medium text-muted-foreground">Active Students</h4>
                                <Users className="w-4 h-4 text-primary" />
                             </div>
                             <div className="text-4xl font-bold text-foreground">{activeStudents}</div>
                             <p className="text-xs text-green-500 mt-2 flex items-center gap-1">+4% from last hour</p>
                          </div>
                          <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm relative overflow-hidden group">
                             <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                             <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-medium text-muted-foreground">Tasks Completed</h4>
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                             </div>
                             <div className="text-4xl font-bold text-foreground">{tasksCompleted}</div>
                             <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">Grading queue is progressing</p>
                          </div>
                          <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm relative overflow-hidden group">
                             <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                             <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-medium text-muted-foreground">System Uptime</h4>
                                <Activity className="w-4 h-4 text-blue-500" />
                             </div>
                             <div className="text-4xl font-bold text-foreground">{systemUptime}%</div>
                             <p className="text-xs text-blue-500 mt-2 flex items-center gap-1">Optimal Performance</p>
                          </div>
                        </div>
                        <div className="flex-1 bg-card border border-border/50 rounded-xl p-5 shadow-sm flex flex-col relative overflow-hidden">
                           <h4 className="text-sm font-medium text-foreground mb-4">Live Activity Stream</h4>
                           <div className="flex-1 flex flex-col justify-end gap-3 pb-2 pt-10">
                              <div className="absolute top-12 left-0 right-0 h-16 bg-gradient-to-b from-card to-transparent z-10" />
                              {[
                                { time: 'Just now', msg: 'Sarah submitted "Data Structures Assmt 2"', type: 'success' },
                                { time: '2m ago', msg: 'System automatically graded 12 quizzes', type: 'info' },
                                { time: '5m ago', msg: 'Prof. Davis scheduled a proctor meet', type: 'warning' },
                              ].map((log, i) => (
                                <div key={log.msg} className="flex items-start gap-3 p-3 rounded-lg border border-border/30 bg-muted/20 text-sm">
                                  <div className={`mt-0.5 w-2 h-2 rounded-full ${log.type === 'success' ? 'bg-green-500' : log.type === 'info' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                                  <div className="flex-1">
                                     <div className="text-foreground tracking-tight">{log.msg}</div>
                                     <div className="text-xs text-muted-foreground mt-0.5">{log.time}</div>
                                  </div>
                                </div>
                              ))}
                           </div>
                        </div>
                      </>
                    )}

                    {activeSidebarIndex === 1 && (
                      <div className="flex-1 bg-card border border-border/50 rounded-xl p-5 shadow-sm space-y-4 overflow-hidden">
                         <div className="grid grid-cols-4 gap-4 text-xs font-semibold text-muted-foreground pb-2 border-b border-border/50">
                            <div className="col-span-2">Student Directory</div>
                            <div>Roll No.</div>
                            <div>Status</div>
                         </div>
                         {[
                           { name: "Alice Johnson", roll: "CS-101" },
                           { name: "Bob Smith", roll: "CS-102" },
                           { name: "Charlie Davis", roll: "CS-103" },
                           { name: "Diana Prince", roll: "CS-104" },
                           { name: "Evan Wright", roll: "CS-105" }
                         ].map((s, i) => (
                            <div key={i} className="grid grid-cols-4 gap-4 text-sm items-center py-2">
                               <div className="col-span-2 flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">{s.name[0]}</div>
                                  <span className="font-medium text-foreground">{s.name}</span>
                               </div>
                               <div className="text-muted-foreground font-medium">{s.roll}</div>
                               <div><div className="w-16 py-1 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center text-[10px] uppercase font-bold tracking-wider border border-green-500/20">Active</div></div>
                            </div>
                         ))}
                      </div>
                    )}

                    {activeSidebarIndex === 2 && (
                      <div className="flex-1 grid grid-cols-2 gap-4 auto-rows-min">
                         {[
                           { title: "Data Structures - Trees", subject: "Computer Science", due: "Tomorrow" },
                           { title: "Quantum Physics Lab", subject: "Physics", due: "In 3 Days" },
                           { title: "Calculus III Homework", subject: "Mathematics", due: "Next Week" },
                           { title: "World History Essay", subject: "History", due: "Next Week" }
                         ].map((task, i) => (
                           <div key={i} className="bg-card border border-border/50 rounded-xl p-5 shadow-sm flex flex-col gap-2 relative overflow-hidden group hover:border-primary/50 transition-colors cursor-pointer">
                             <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                             <div className="flex justify-between items-start">
                               <div className="font-bold text-foreground text-sm leading-tight pr-2">{task.title}</div>
                               <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 shadow-sm"><FileText className="w-4 h-4 text-primary" /></div>
                             </div>
                             <div className="text-xs font-semibold text-muted-foreground">{task.subject}</div>
                             <div className="mt-4 pt-4 border-t border-border/40 flex justify-between items-center">
                               <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Clock className="w-3 h-3"/> {task.due}</div>
                               <div className="px-2.5 py-1 text-[10px] font-bold text-yellow-600 bg-yellow-500/20 rounded shadow-sm border border-yellow-500/20">Pending</div>
                             </div>
                           </div>
                         ))}
                      </div>
                    )}

                    {activeSidebarIndex === 3 && (
                      <div className="flex-1 bg-card border border-border/50 rounded-xl p-6 shadow-sm flex flex-col">
                         <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/50">
                            <h4 className="font-bold text-foreground tracking-tight text-lg">Weekly Engagement Analytics</h4>
                            <div className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 shadow-sm">Updated Today</div>
                         </div>
                         <div className="flex-1 w-full h-[200px] mt-2 relative">
                           {isMounted ? (
                             <ResponsiveContainer width="100%" height="100%">
                               <LineChart data={[
                                 { day: 'Mon', engagement: 42 },
                                 { day: 'Tue', engagement: 68 },
                                 { day: 'Wed', engagement: 55 },
                                 { day: 'Thu', engagement: 89 },
                                 { day: 'Fri', engagement: 72 },
                                 { day: 'Sat', engagement: 85 },
                                 { day: 'Sun', engagement: 60 }
                               ]}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                 <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                                 <YAxis hide domain={[0, 100]} />
                                 <Tooltip 
                                   contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "8px", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                                   itemStyle={{ color: "hsl(var(--foreground))", fontSize: "14px", fontWeight: "bold" }}
                                 />
                                 <Line 
                                   type="monotone" 
                                   dataKey="engagement" 
                                   stroke={strokeColor} 
                                   strokeWidth={3} 
                                   dot={{ r: 4, fill: strokeColor, strokeWidth: 2, stroke: "hsl(var(--background))" }} 
                                   activeDot={{ r: 6, fill: strokeColor, strokeWidth: 0 }} 
                                   animationDuration={1500}
                                   isAnimationActive={true}
                                 />
                               </LineChart>
                             </ResponsiveContainer>
                           ) : (
                              <div className="w-full h-full bg-muted/20 animate-pulse rounded-md border border-border/30" />
                           )}
                         </div>
                      </div>
                    )}

                    {activeSidebarIndex === 4 && (
                      <div className="flex-1 bg-card border border-border/50 rounded-xl p-6 shadow-sm space-y-8 max-w-2xl">
                         <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-inner"><Settings className="w-6 h-6 text-primary" /></div>
                            <div className="space-y-1">
                               <div className="font-bold text-xl tracking-tight text-foreground">Platform Preferences</div>
                               <div className="text-sm font-medium text-muted-foreground">Manage your notification delivery and security settings</div>
                            </div>
                         </div>
                         <div className="space-y-6 pt-6 border-t border-border/50">
                            {[
                              { title: "Email Notifications", desc: "Receive summary reports of daily class activities" },
                              { title: "Dark Mode Toggle", desc: "Switch between light and dark themes automatically" },
                              { title: "Two-Factor Auth (2FA)", desc: "Secure your administrative account with extra layers" }
                            ].map((s, i) => (
                              <div key={i} className="flex justify-between items-center p-3 rounded-xl hover:bg-muted/30 transition-colors border border-transparent hover:border-border/50 cursor-pointer">
                                <div className="space-y-1">
                                   <div className="text-sm font-bold text-foreground">{s.title}</div>
                                   <div className="text-xs font-medium text-muted-foreground">{s.desc}</div>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative transition-colors shadow-inner ${i === 1 ? 'bg-primary' : 'bg-muted/80'}`}>
                                  <div className={`absolute top-1 bottom-1 w-4 bg-background rounded-full shadow-sm transition-all ${i === 1 ? 'right-1' : 'left-1'}`} />
                                </div>
                              </div>
                            ))}
                         </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 hidden md:block">
              Everything you need to <span className="text-primary italic">excel</span>.
            </h2>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 md:hidden">
              Features
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful tools designed to reduce administrative overhead and increase meaningful connections between students and educators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="relative p-6 rounded-2xl border border-border/50 bg-card hover:shadow-xl transition-all duration-300 group overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform translate-x-4 -translate-y-4">
                  <feature.icon className="w-32 h-32" />
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.name}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Up and running in <span className="text-primary">minutes</span>.
            </h2>
            <p className="text-muted-foreground text-lg">No steep learning curve. Just a simple, powerful flow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            <div className="hidden lg:block absolute top-10 left-[12%] right-[12%] h-px bg-border/60 -z-0" />
            {steps.map((step, idx) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="relative flex flex-col items-center text-center p-6 rounded-2xl bg-card border border-border/50 group hover:shadow-xl hover:border-primary/30 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-extrabold text-lg mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 z-10">
                  {step.number}
                </div>
                <h3 className="text-lg font-bold mb-3 text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 -z-10" />
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Ready to transform your classroom?
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join thousands of teachers and students who are already using ClassPulse to streamline their educational journey.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/signup">
                <Button size="lg" className="h-14 px-8 text-base rounded-full shadow-xl">
                  Get Started for Free
                </Button>
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4 sm:mt-0 sm:ml-4">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> No credit card required
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
