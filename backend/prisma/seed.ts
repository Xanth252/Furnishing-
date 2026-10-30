import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Seed default admin user
  const existingUser = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (!existingUser) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash,
      },
    });
    console.log('Admin user created (admin / admin123)');
  }

  // 2. Seed default particulars
  const defaultParticulars = [
    { particular: 'Curtain Main Fabric', defaultUnit: 'mtr', defaultRate: 850, usageCount: 10 },
    { particular: 'Curtain Sheer / Net Fabric', defaultUnit: 'mtr', defaultRate: 450, usageCount: 8 },
    { particular: 'Heavy Duty Aluminium Track Channel', defaultUnit: 'ft', defaultRate: 120, usageCount: 7 },
    { particular: 'Curtain Stitching & Eyelet Finishing', defaultUnit: 'mtr', defaultRate: 180, usageCount: 6 },
    { particular: 'Roman Blinds with Fabric & Mechanism', defaultUnit: 'sq ft', defaultRate: 220, usageCount: 5 },
    { particular: 'Zebra / Roller Blinds', defaultUnit: 'sq ft', defaultRate: 160, usageCount: 4 },
    { particular: 'Designer Wallpaper Supply & Installation', defaultUnit: 'sq ft', defaultRate: 75, usageCount: 4 },
    { particular: 'Curtain Tiebacks & Brass Hooks', defaultUnit: 'pair', defaultRate: 350, usageCount: 3 },
    { particular: 'Installation & Fitting Charges', defaultUnit: 'pcs', defaultRate: 150, usageCount: 3 },
  ];

  for (const item of defaultParticulars) {
    const existing = await prisma.savedParticular.findUnique({
      where: { particular: item.particular },
    });
    if (!existing) {
      await prisma.savedParticular.create({
        data: item,
      });
    }
  }
  console.log('Default particulars seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
