// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Default platform organization — matches the 'bnz-green' slug tenant.ts
  // falls back to when no tenant resolves. Without a real row here, the
  // org-scoped /api/campaigns route would show zero campaigns on a fresh
  // local database.
  const defaultOrg = await prisma.organization.upsert({
    where:  { slug: 'bnz-green' },
    update: {},
    create: {
      name: 'BNZ Impact',
      slug: 'bnz-green',
      primary_color: '#2d5a1b',
      tree_price: 500,
      farmer_id_prefix: 'BNZ',
      donation_ref_prefix: 'BNZ',
      plan: 'ENTERPRISE',
      active: true,
    },
  });

  // Starter campaigns for local development / demo — each tenant manages
  // their own campaigns for real via Admin → Campaigns once deployed.
  const campaigns = [
    { name: 'Dadi Campaign', slug: 'dadi', shortName: 'Dadi', subtitle: 'In Honour of Your Grandmother', dedicationLabel: 'Grandmother', description: 'Plant trees in honour of your grandmother — a tribute as enduring as her wisdom and love.', treePrice: 500, active: true, displayOrder: 0,
      packages: [
        { id: 'pkg-108', trees: 108, badge: 'विरासत निर्माता', badgeEn: 'Diamond Legacy', emoji: '💎', popular: false, description: 'The sacred 108 — create an entire forest in her name.' },
        { id: 'pkg-54',  trees: 54,  badge: 'समर्पित',         badgeEn: 'Platinum Legacy', emoji: '🏆', popular: true,  description: 'A thriving grove that will outlast generations.' },
        { id: 'pkg-27',  trees: 27,  badge: 'संकल्पी',          badgeEn: 'Gold Legacy',    emoji: '🥇', popular: false, description: 'The auspicious number — a micro-forest of meaning.' },
        { id: 'pkg-11',  trees: 11,  badge: 'प्रेरक',           badgeEn: 'Silver Legacy',  emoji: '🥈', popular: false, description: 'Eleven trees — one for every blessing she has given.' },
      ] },
    { name: 'Maa Campaign', slug: 'maa', shortName: 'Maa', subtitle: 'In Honour of Your Mother', dedicationLabel: 'Mother', description: 'Honour your mother with a living legacy that grows stronger with every passing year.', treePrice: 500, active: true, displayOrder: 1 },
    { name: 'Beti Campaign', slug: 'beti', shortName: 'Beti', subtitle: 'In Honour of Your Daughter', dedicationLabel: 'Daughter', description: 'Celebrate your daughter with a tree that grows alongside her, strong and rooted.', treePrice: 500, active: true, displayOrder: 2 },
    { name: 'Poti Campaign', slug: 'poti', shortName: 'Poti', subtitle: 'In Honour of Your Granddaughter', dedicationLabel: 'Granddaughter', description: 'Gift your granddaughter a forest of possibilities — a green inheritance for the future.', treePrice: 500, active: true, displayOrder: 3 },
    { name: 'Individual Tree Purchase', slug: 'individual', shortName: 'Individual', dedicationLabel: 'Someone Special', description: 'Buy 1 tree or any custom quantity — starting at ₹500 per tree.', treePrice: 500, active: true, displayOrder: 4 },
  ];

  for (const campaign of campaigns) {
    await prisma.campaign.upsert({
      where: { slug: campaign.slug },
      update: { name: campaign.name, description: campaign.description, orgId: defaultOrg.id },
      create: { ...campaign, orgId: defaultOrg.id },
    });
  }

  // Admin user
  const hashedPassword = await bcrypt.hash('admin@123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@jitomumbai.org' },
    update: {},
    create: {
      name: 'JITO Admin',
      email: 'admin@jitomumbai.org',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  // Also keep old admin email working
  await prisma.user.upsert({
    where: { email: 'admin@treeplantation.org' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@treeplantation.org',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  // Plantation sites
  const sites = [
    { siteName: 'Aravalli Greens', location: 'Aravalli Hills, Rajasthan', acreage: 50, partnerName: 'Forest Department Rajasthan' },
    { siteName: 'Western Ghats Restoration', location: 'Sahyadri, Maharashtra', acreage: 120, partnerName: 'Maharashtra Forest Corp' },
    { siteName: 'Yamuna Floodplain Forest', location: 'Delhi NCR', acreage: 30, partnerName: 'DDA Green Cell' },
  ];

  const existingSites = await prisma.plantationSite.count();
  if (existingSites === 0) {
    for (const site of sites) {
      await prisma.plantationSite.create({ data: site });
    }
  }

  console.log('✅ JITO Green Legacy seed completed');
  console.log('   Admin: admin@jitomumbai.org / admin@123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

  // Seed a test field officer
  const officerPass = await bcrypt.hash('officer@123', 12);
  const existing = await prisma.fieldOfficer.findFirst({ where: { email: 'officer@jitomumbai.org' } }).catch(() => null);
  if (!existing) {
    await prisma.fieldOfficer.create({
      data: {
        name:        'Ramesh Patil',
        email:       'officer@jitomumbai.org',
        mobile:      '+919876543211',
        password:    officerPass,
        employeeId:  'JGL-FO-001',
        designation: 'Field Officer',
        district:    'Palghar',
        state:       'Maharashtra',
      },
    });
  }
  console.log('✅ Field Officer seeded: officer@jitomumbai.org / officer@123');
