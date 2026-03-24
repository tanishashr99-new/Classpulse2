-- Run this in your Supabase SQL Editor to enable the marks system

CREATE TABLE IF NOT EXISTS public.student_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id),
  student_id UUID REFERENCES auth.users(id),
  student_name TEXT,
  subject TEXT NOT NULL,
  cycle_test_1 INTEGER CHECK (cycle_test_1 BETWEEN 0 AND 100),
  cycle_test_2 INTEGER CHECK (cycle_test_2 BETWEEN 0 AND 100),
  term_grade TEXT,
  cgpa DECIMAL(3,1) CHECK (cgpa BETWEEN 0 AND 10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, subject)
);

ALTER TABLE public.student_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all reads on student_marks" ON public.student_marks
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated inserts on student_marks" ON public.student_marks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates on student_marks" ON public.student_marks
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Also add student_marks to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_marks;
