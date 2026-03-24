-- Run this script in your Supabase SQL Editor to add the required columns for explicit day, date, and time tracking.

ALTER TABLE public.attendance_records 
ADD COLUMN IF NOT EXISTS "day" TEXT,
ADD COLUMN IF NOT EXISTS "date" TEXT,
ADD COLUMN IF NOT EXISTS "time" TEXT;
