-- Run this script in your Supabase SQL Editor to enable system file uploads

-- Add file link column to assignments
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS "file_url" TEXT;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS "given_date" TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS "file_url" TEXT;
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS "assignment_id" UUID;

-- Enable Policies for assignment submissions
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for students" ON public.assignment_submissions;
CREATE POLICY "Enable insert for students" ON public.assignment_submissions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable select for all" ON public.assignment_submissions;
CREATE POLICY "Enable select for all" ON public.assignment_submissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable update for all" ON public.assignment_submissions;
CREATE POLICY "Enable update for all" ON public.assignment_submissions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for all" ON public.assignment_submissions;
CREATE POLICY "Enable delete for all" ON public.assignment_submissions FOR DELETE USING (true);

-- Create storage bucket for files
insert into storage.buckets (id, name, public) 
values ('class_resources', 'class_resources', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Ensure public access to the bucket
CREATE POLICY "Public Access" 
  ON storage.objects FOR SELECT 
  USING ( bucket_id = 'class_resources' );

CREATE POLICY "Enable uploads for all" 
  ON storage.objects FOR INSERT 
  WITH CHECK ( bucket_id = 'class_resources' );

CREATE POLICY "Enable updates for all" 
  ON storage.objects FOR UPDATE
  WITH CHECK ( bucket_id = 'class_resources' );
