import Link from "next/link";
import { BookOpen } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95 backdrop-blur-xl">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
              <div className="bg-primary/10 p-2 rounded-xl">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <span>ClassPulse</span>
            </Link>
            <p className="text-muted-foreground max-w-sm mt-4 leading-relaxed">
              Revolutionizing the modern classroom experience. 
              Bridging the gap between educators and students with powerful, intuitive tools.
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground tracking-tight">Platform</h4>
            <ul className="space-y-2">
              <li><Link href="/" className="text-muted-foreground hover:text-foreground hover:underline underline-offset-4 transition-colors">Home</Link></li>
              <li><Link href="/#demo" className="text-muted-foreground hover:text-foreground hover:underline underline-offset-4 transition-colors">Dashboard</Link></li>
              <li><Link href="/#features" className="text-muted-foreground hover:text-foreground hover:underline underline-offset-4 transition-colors">Features</Link></li>
              <li><Link href="/#how-it-works" className="text-muted-foreground hover:text-foreground hover:underline underline-offset-4 transition-colors">How it Works</Link></li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground tracking-tight">Company</h4>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-muted-foreground hover:text-foreground hover:underline underline-offset-4 transition-colors">About</Link></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-foreground hover:underline underline-offset-4 transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground hover:underline underline-offset-4 transition-colors">Privacy</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ClassPulse. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">Designed with absolute precision.</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
