-- =========================================
-- MASTER SQL SCRIPT: FULL REAL-TIME LINKAGE
-- =========================================

-- 1. ASSIGNMENTS TABLE (Created by Teachers)
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES auth.users ON DELETE CASCADE,
    subject TEXT NOT NULL,
    title TEXT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    difficulty TEXT DEFAULT 'Medium',
    total_points INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. SUBMISSIONS TABLE (Students Submitting Assignments)
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES public.assignments ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users ON DELETE CASCADE,
    student_name TEXT,
    status TEXT DEFAULT 'submitted', -- 'submitted', 'graded'
    score INTEGER,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(assignment_id, student_id)
);

-- 3. ATTENDANCE TABLE (Marked by Teachers for Students)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES auth.users ON DELETE CASCADE,
    subject TEXT NOT NULL,
    student_id UUID REFERENCES auth.users ON DELETE CASCADE,
    student_name TEXT,
    date DATE DEFAULT CURRENT_DATE,
    status TEXT NOT NULL, -- 'present' or 'absent'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(teacher_id, student_id, date) 
);

-- =========================================
-- ENABLE RLS (Row Level Security)
-- =========================================
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- =========================================
-- DROP EXISTING POLICIES TO PREVENT ERRORS
-- =========================================
DROP POLICY IF EXISTS "Allow public read access to assignments" ON public.assignments;
DROP POLICY IF EXISTS "Allow authenticated insert to assignments" ON public.assignments;

DROP POLICY IF EXISTS "Allow public read access to submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Allow authenticated insert/update to submissions" ON public.assignment_submissions;

DROP POLICY IF EXISTS "Allow public read access to attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow authenticated insert/update to attendance" ON public.attendance_records;


-- =========================================
-- CREATE PERMISSIVE POLICIES FOR MVP
-- =========================================
CREATE POLICY "Allow public read access to assignments" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert to assignments" ON public.assignments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow public read access to submissions" ON public.assignment_submissions FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert/update to submissions" ON public.assignment_submissions FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow public read access to attendance" ON public.attendance_records FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert/update to attendance" ON public.attendance_records FOR ALL USING (auth.role() = 'authenticated');

-- =========================================
-- ENABLE REALTIME DATABASE SUBSCRIPTIONS
-- =========================================
-- This tells Supabase to broadcast row changes (INSERT, UPDATE, DELETE) back to client apps!
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
