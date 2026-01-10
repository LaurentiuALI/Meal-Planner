import { db } from './src/lib/db';

async function main() {
  console.log('Checking db.settings...');
  if (db.settings) {
    console.log('db.settings exists');
    const s = await db.settings.findUnique({ where: { id: 'global' } });
    console.log('Settings:', s);
  } else {
    console.error('db.settings is UNDEFINED');
  }
}

main();
