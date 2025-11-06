import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function main() {
  const root = process.cwd();
  const packagePath = resolve(root, 'package.json');
  const vercelPath = resolve(root, 'vercel.json');

  const rawPackage = await readFile(packagePath, 'utf8');
  const packageJson = JSON.parse(rawPackage);

  if (!packageJson.vercel) {
    console.error('No "vercel" configuration found in package.json.');
    process.exit(1);
  }

  await writeFile(
    vercelPath,
    `${JSON.stringify(packageJson.vercel, null, 2)}\n`
  );

  console.log('vercel.json updated from package.json#vercel');
}

main().catch((error) => {
  console.error('Failed to sync Vercel configuration:', error);
  process.exit(1);
});
