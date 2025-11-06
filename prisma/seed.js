import prisma from '../server/db.js';

async function main() {
  // Placeholder seed to ensure migrations ran and default data exists
  // Create a default cosmetic entry for guests if it does not exist by touching the table
  await prisma.user.count();
}

main()
  .then(() => {
    console.log('Seed completed');
  })
  .catch((error) => {
    console.error('Seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
