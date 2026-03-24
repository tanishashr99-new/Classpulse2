CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    rollno TEXT UNIQUE NOT NULL,
    registration_no TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely recreate the policy if it exists
DROP POLICY IF EXISTS "Allow public read access to students" ON public.students;
DROP POLICY IF EXISTS "Allow students to insert their own profile" ON public.students;
DROP POLICY IF EXISTS "Allow students to update their own profile" ON public.students;

-- Set up permissive Row Level Security (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to students" 
ON public.students FOR SELECT USING (true);

CREATE POLICY "Allow students to insert their own profile" 
ON public.students FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow students to update their own profile" 
ON public.students FOR UPDATE USING (auth.uid() = id);
