CREATE TABLE IF NOT EXISTS public.proctor_meets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES auth.users ON DELETE CASCADE,
    teacher_name TEXT NOT NULL,
    teacher_subject TEXT NOT NULL,
    student_email TEXT NOT NULL, -- The specific student invited, or 'all' for the whole class
    topic TEXT NOT NULL,
    meet_link TEXT NOT NULL,
    meeting_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely recreate policies
DROP POLICY IF EXISTS "Allow public read access to meets" ON public.proctor_meets;
DROP POLICY IF EXISTS "Allow authenticated insert to meets" ON public.proctor_meets;

-- Set up permissive Row Level Security (RLS)
ALTER TABLE public.proctor_meets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to meets" 
ON public.proctor_meets FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert to meets" 
ON public.proctor_meets FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update to meets" 
ON public.proctor_meets FOR UPDATE USING (auth.role() = 'authenticated');

-- ADD STATUS COLUMN SAFELY IF NOT EXISTS
ALTER TABLE public.proctor_meets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
