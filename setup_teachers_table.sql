CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the 10 predefined teachers
INSERT INTO public.teachers (teacher_id, name, subject) VALUES 
('teacher1', 'Dr. Alan Turing', 'DSA'),
('teacher2', 'Prof. Grace Hopper', 'IML'),
('teacher3', 'Dr. John von Neumann', 'OOPS'),
('teacher4', 'Prof. Ada Lovelace', 'COA'),
('teacher5', 'Dr. Donald Knuth', 'Java'),
('teacher6', 'Prof. Barbara Liskov', 'Python'),
('teacher7', 'Dr. Tim Berners-Lee', 'Computer Networks'),
('teacher8', 'Prof. Margaret Hamilton', 'Operating Systems'),
('teacher9', 'Dr. Edgar Codd', 'DBMS'),
('teacher10', 'Prof. Linus Torvalds', 'Software Engineering')
ON CONFLICT (teacher_id) DO UPDATE SET 
    name = EXCLUDED.name, 
    subject = EXCLUDED.subject;
    
-- Set up permissive Row Level Security (RLS) so the frontend can read the list if needed
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Safely recreate the policy if it exists
DROP POLICY IF EXISTS "Allow public read access to teachers" ON public.teachers;

CREATE POLICY "Allow public read access to teachers" 
ON public.teachers 
FOR SELECT 
USING (true);
