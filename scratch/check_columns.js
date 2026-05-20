import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mvrywaffldfzzjgfctfp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12cnl3YWZmbGRmenpqZ2ZjdGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTk5OTcsImV4cCI6MjA5NDUzNTk5N30.BmzKU0SEbGW4oy7Ib8h5Yxs8bXoLc3Hv1g2ckg6zPpU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  console.log("Fetching one row from Students table to check active schema...");
  const { data, error } = await supabase.from('Students').select('*').limit(1);
  if (error) {
    console.error("Error fetching from Students table:", error);
  } else {
    console.log("Success! Columns found in row:", data.length > 0 ? Object.keys(data[0]) : "No rows in table yet!");
  }
}

check();
