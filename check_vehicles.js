import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mmsfpuhdtkkzewopzjqs.supabase.co';
const supabaseKey = 'sb_publishable_ios6oZz4g95wNAPzoptzRw_6cOpTLjx';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('vehicles').select('*');
  console.log('Vehicles Data:', data);
  console.log('Error:', error);
}

check();
