const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oxjbswrcdhlbifgsnhll.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94amJzd3JjZGhsYmlmZ3NuaGxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MjYyNzYsImV4cCI6MjA5OTMwMjI3Nn0.6PjiQl8rtMvROm3Zlfr9FR31JZfQziHK09GzlvhJWjg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('restaurants').select('*');
  if (error) {
    console.error('Error fetching restaurants:', error);
  } else {
    console.log('Restaurants in DB:', JSON.stringify(data, null, 2));
  }
}

check();
