"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, User, LogOut } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import { supabase } from "@/lib/supabase";

export function DashboardHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [userData, setUserData] = useState<{ 
    name: string, 
    email: string, 
    avatarUrl: string | null,
    rollno?: string,
    registration_no?: string,
    role?: string
  } | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const meta = data.session.user.user_metadata || {};
        
        let dbName = meta.full_name || meta.name;
        let dbRole = "student";
        let dbRoll = meta.rollno;
        let dbReg = meta.registration_no;
        
        const { data: tData } = await supabase.from('teachers').select('name').eq('id', data.session.user.id).single();
        if (tData) {
           dbName = tData.name;
           dbRole = "teacher";
        } else {
           const { data: sData } = await supabase.from('students').select('name, rollno, registration_no').eq('id', data.session.user.id).single();
           if (sData) {
              dbName = sData.name;
              dbRoll = sData.rollno;
              dbReg = sData.registration_no;
           }
        }
        
        setUserData({
          name: dbName || "User",
          email: data.session.user.email || "user@classpulse.com",
          avatarUrl: meta.avatar_url || null,
          rollno: dbRoll,
          registration_no: dbReg,
          role: dbRole
        });
      }
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const title = pathname.split("/").pop() || "Dashboard";
  const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-10 transition-all">
      <div className="flex items-center gap-4 flex-1">
        <h1 className="text-xl font-semibold tracking-tight hidden sm:block">
          {capitalizedTitle === "Teacher" || capitalizedTitle === "Student" ? "Overview" : capitalizedTitle}
        </h1>
        <div className="relative max-w-md w-full ml-4 hidden md:block">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search classes, assignments..." 
            className="pl-9 bg-muted/50 border-border/50 focus-visible:ring-primary/20 transition-all rounded-full"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 flex-1">
        <ThemeToggle />
        
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative rounded-full cursor-pointer")}>
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute top-2 right-2.5 h-2 w-2 bg-destructive rounded-full animate-pulse border border-background" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <div className="p-4 py-8 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost" }), "relative h-9 w-9 rounded-full ml-2 p-0 cursor-pointer overflow-hidden")}>
            <Avatar className="h-9 w-9 border border-primary/20">
              {userData?.avatarUrl ? (
                 <AvatarImage src={userData.avatarUrl} alt={userData.name} />
              ) : (
                 <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                   {userData?.name ? userData.name.substring(0, 2).toUpperCase() : "UK"}
                 </AvatarFallback>
              )}
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-2">
                  <div>
                    <p className="text-sm font-medium leading-none">&nbsp;</p>
                    <p className="text-xs leading-none text-muted-foreground mt-1">
                      @giet.edu
                    </p>
                  </div>
                  {userData?.rollno && (
                    <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Roll No.</p>
                        <p className="font-medium">{userData.rollno}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Reg No.</p>
                        <p className="font-medium">{userData.registration_no}</p>
                      </div>
                    </div>
                  )}
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
