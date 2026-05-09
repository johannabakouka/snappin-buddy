import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://jfzdrccnzzwhvzbxgtjo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmemRyY2Nuenp3aHZ6YnhndGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDc1ODMsImV4cCI6MjA5MzcyMzU4M30.huwEpeKJNwjn-5R56DknZhpmxjv2ZAk60HWcQWV5RN8'
)