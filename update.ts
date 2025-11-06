import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';

async function run() {
  const targetPath = resolve(process.cwd(), 'src/index.tsx');
  const nextContent = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element with id "root" not found');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

  await fs.writeFile(targetPath, nextContent, 'utf8');
  console.log(`Updated ${targetPath}`);
}

run().catch((error) => {
  console.error('Failed to update index file', error);
  process.exit(1);
});
