import { createClient } from '@supabase/supabase-js';

const TESTOR_DB_URL = 'https://hervrnzkctfppeoayokx.supabase.co';
const TESTOR_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcnZybnprY3RmcHBlb2F5b2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MzE5MjcsImV4cCI6MjA2MjAwNzkyN30.k5_pQgoxCxxyvlcaz9gFNGVzcnMlz00O_yDPj8bwHYQ';

export const supabaseTestor = createClient(TESTOR_DB_URL, TESTOR_ANON_KEY);
