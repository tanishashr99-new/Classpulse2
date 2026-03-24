"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { motion } from "framer-motion";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const role = pathname.includes("/teacher") ? "teacher" : "student";

  return (
    <div className="flex h-screen bg-muted/10 overflow-hidden">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto w-full relative">
          <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_24px]"></div>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="h-full p-4 sm:p-6 md:p-8"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
