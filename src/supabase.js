import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://xyyhxxaxmyicvgijcqau.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5eWh4eGF4bXlpY3ZnaWpjcWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2Njk5MjksImV4cCI6MjA5MzI0NTkyOX0.yfmTot10KpQTZtztv2y1Jf0DHLgxwIxs3xMe1OgPE9s'

export const supabase = createClient(url, key)
