const fs = require('fs');

const exts = ['.tsx', '.ts'];

const map = {
  'bg-\\[#0B0C10\\]': 'bg-gray-50',
  'bg-zinc-950': 'bg-white',
  'bg-zinc-900': 'bg-white',
  'bg-zinc-800': 'bg-gray-100',
  'bg-zinc-700': 'bg-gray-200',
  'text-zinc-300': 'text-gray-700',
  'text-zinc-400': 'text-gray-500',
  'text-zinc-500': 'text-gray-400',
  'border-zinc-800': 'border-gray-200',
  'border-zinc-700': 'border-gray-300',
  'orange-600': 'red-600',
  'orange-500': 'red-600',
  'orange-400': 'red-500',
  'orange-700': 'red-700'
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (exts.some(ext => file.endsWith(ext))) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  
  for (const [key, value] of Object.entries(map)) {
    const regex = new RegExp(key, 'g');
    content = content.replace(regex, value);
  }
  
  if (original !== content) {
    fs.writeFileSync(f, content);
    console.log(`Updated ${f}`);
  }
});
