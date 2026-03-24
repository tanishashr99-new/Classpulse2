-- Run this script in your Supabase SQL Editor to add the materials table

CREATE TABLE IF NOT EXISTS public.materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and setup policies (assuming standard anon access for reads if needed)
-- ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable read access for all users" ON public.materials FOR SELECT USING (true);
-- CREATE POLICY "Enable insert access for all users" ON public.materials FOR INSERT WITH CHECK (true);
