import { ReactNode } from "react";
import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/20 relative">
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 w-full">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
        <ThemeToggle />
      </header>
      
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md h-96 bg-primary/20 rounded-full blur-[100px] opacity-20 pointer-events-none" />
        
        {children}
      </main>
    </div>
  );
}
