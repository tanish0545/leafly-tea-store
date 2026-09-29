import fs from 'fs';

const html = fs.readFileSync('dist/index.html', 'utf8');

// Match any <link> tag with rel containing icon
const linkTags = [...html.matchAll(/<link[^>]+>/gi)].map(m => m[0]);
const iconLinks = linkTags.filter(tag => /rel\s*=\s*["'][^"']*icon[^"']*["']/i.test(tag));

console.log('=== All Icon-related Link Tags in dist/index.html ===');
iconLinks.forEach((tag, idx) => {
  console.log(`${idx + 1}: ${tag}`);
});

const relIconOnly = linkTags.filter(tag => /rel\s*=\s*["']icon["']/i.test(tag));
console.log('\n=== Exact rel="icon" Tags in dist/index.html ===');
console.log(`Count: ${relIconOnly.length}`);
relIconOnly.forEach((tag, idx) => {
  console.log(`${idx + 1}: ${tag}`);
});

const shortcutLinks = linkTags.filter(tag => /shortcut/i.test(tag));
console.log(`\nShortcut icon link count: ${shortcutLinks.length}`);

if (relIconOnly.length === 1 && relIconOnly[0].includes('/favicon-48x48.png') && shortcutLinks.length === 0) {
  console.log('\nSUCCESS: Exactly ONE canonical rel="icon" tag found and ZERO shortcut icon tags!');
} else {
  console.error('\nFAILURE: Unexpected icon tags found in dist/index.html');
  process.exit(1);
}
