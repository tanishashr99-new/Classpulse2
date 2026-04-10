-- =========================================
-- FACE RECOGNITION SYSTEM SETUP
-- =========================================

-- 1. FACE DESCRIPTORS TABLE (Student Registration)
CREATE TABLE IF NOT EXISTS public.face_descriptors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES auth.users ON DELETE CASCADE,
    descriptor JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id)
);

-- 2. ATTENDANCE SESSIONS TABLE (Started by Teachers)
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES auth.users ON DELETE CASCADE,
    subject TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.face_descriptors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for face_descriptors
DROP POLICY IF EXISTS "Public read descriptors" ON public.face_descriptors;
DROP POLICY IF EXISTS "Users can manage own descriptors" ON public.face_descriptors;
CREATE POLICY "Public read descriptors" ON public.face_descriptors FOR SELECT USING (true);
CREATE POLICY "Users can manage own descriptors" ON public.face_descriptors FOR ALL USING (auth.uid() = student_id);

-- Policies for attendance_sessions
DROP POLICY IF EXISTS "Public read sessions" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Authenticated users sessions write" ON public.attendance_sessions;
CREATE POLICY "Public read sessions" ON public.attendance_sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated users sessions write" ON public.attendance_sessions FOR ALL USING (auth.role() = 'authenticated');

-- Add to Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;
