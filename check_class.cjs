const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://mvrywaffldfzzjgfctfp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12cnl3YWZmbGRmenpqZ2ZjdGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTk5OTcsImV4cCI6MjA5NDUzNTk5N30.BmzKU0SEbGW4oy7Ib8h5Yxs8bXoLc3Hv1g2ckg6zPpU');
async function main() {
  const { data } = await supabase.from('Students').select('name, class_name, teacher, teacher_order').eq('teacher', 'Salohiddinov Otabek');
  console.table(data);
}
main();
