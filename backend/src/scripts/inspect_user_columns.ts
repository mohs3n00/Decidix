import { prisma } from '../database/prisma.js';

async function main() {
  const cols = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'users'
    ORDER BY ordinal_position;
  `;
  console.log('Columns in users table:', cols);
}

main().catch(console.error).finally(() => prisma.$disconnect());
