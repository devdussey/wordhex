#!/usr/bin/env node

/**
 * Helper script to encode a database password for use in DATABASE_URL
 * Usage: node scripts/encode-db-password.js "your-password"
 */

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/encode-db-password.js "your-password"');
  console.error('\nExample:');
  console.error('  node scripts/encode-db-password.js "my@password#123"');
  process.exit(1);
}

// URL-encode the password
const encodedPassword = encodeURIComponent(password);

console.log('\n📝 Original password:', password);
console.log('🔐 Encoded password:', encodedPassword);
console.log('\n✅ Use this in your DATABASE_URL:');
console.log(`   postgresql://username:${encodedPassword}@host:port/database\n`);

// Show common special character encodings
const specialChars = {
  '@': '%40',
  ':': '%3A',
  '/': '%2F',
  '#': '%23',
  '?': '%3F',
  '&': '%26',
  '=': '%3D',
  '+': '%2B',
  ' ': '%20',
};

const foundSpecialChars = Object.keys(specialChars).filter(char => password.includes(char));
if (foundSpecialChars.length > 0) {
  console.log('⚠️  Special characters found in password:');
  foundSpecialChars.forEach(char => {
    console.log(`   "${char}" → ${specialChars[char]}`);
  });
  console.log('');
}
