import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Seeding dummy data...');

  // 1. Find the specific broker (premium@teste.com)
  const broker = await prisma.broker.findUnique({
    where: { email: 'premium@teste.com' }
  });
  
  if (!broker) {
    console.error('Broker premium@teste.com not found!');
    process.exit(1);
  }

  console.log(`Found Broker: ${broker.name} (${broker.id})`);

  // 2. Create Properties
  console.log('Creating properties...');
  const prop1 = await prisma.property.create({
    data: {
      title: 'Cobertura Duplex no Itaim',
      description: 'Linda cobertura com piscina privativa e vista panorâmica.',
      price: 4500000,
      commission: 270000,
      location: 'Itaim Bibi, São Paulo',
      bedrooms: 4,
      area: 320,
      status: 'AVAILABLE',
      brokerId: broker.id,
      imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    }
  });

  const prop2 = await prisma.property.create({
    data: {
      title: 'Casa em Condomínio Fechado',
      description: 'Casa espaçosa com área gourmet e segurança 24h.',
      price: 2100000,
      commission: 126000,
      location: 'Alphaville, Barueri',
      bedrooms: 3,
      area: 250,
      status: 'AVAILABLE',
      brokerId: broker.id,
      imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    }
  });

  // 3. Create Leads
  console.log('Creating leads...');
  const lead1 = await prisma.lead.create({
    data: {
      name: 'Carlos Oliveira',
      phone: '5511999990001',
      status: 'NOVO', 
      brokerId: broker.id,
      propertyId: prop1.id,
      notes: 'Interesse em cobertura, pagamento à vista.',
    }
  });

  const lead2 = await prisma.lead.create({
    data: {
      name: 'Mariana Santos',
      phone: '5511999990002',
      status: 'ATENDIMENTO', 
      brokerId: broker.id,
      propertyId: prop2.id,
    }
  });

  const lead3 = await prisma.lead.create({
    data: {
      name: 'Roberto Silva',
      phone: '5511999990003',
      status: 'VISITA',
      brokerId: broker.id,
      propertyId: prop1.id,
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // Abandoned (older than 48h)
    }
  });

  // 4. Create Tasks
  console.log('Creating tasks...');
  await prisma.task.create({
    data: {
      title: 'Ligar para Carlos sobre a cobertura',
      type: 'CALL',
      dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // Today in 2 hours
      status: 'PENDING',
      brokerId: broker.id,
      leadId: lead1.id,
      propertyId: prop1.id,
    }
  });

  await prisma.task.create({
    data: {
      title: 'Visita em Alphaville com Mariana',
      type: 'VISIT',
      dueDate: new Date(Date.now() + 5 * 60 * 60 * 1000), // Today in 5 hours
      status: 'PENDING',
      brokerId: broker.id,
      leadId: lead2.id,
      propertyId: prop2.id,
    }
  });

  // 5. Create Transactions (Income to show in dashboard)
  console.log('Creating transactions...');
  await prisma.transaction.create({
    data: {
      type: 'INCOME',
      amount: 45000,
      description: 'Sinal - Cobertura Itaim',
      date: new Date(),
      status: 'COMPLETED',
      category: 'COMISSAO',
      brokerId: broker.id,
      propertyId: prop1.id,
    }
  });

  await prisma.transaction.create({
    data: {
      type: 'EXPENSE',
      amount: 1500,
      description: 'Anúncios Zap Imóveis',
      date: new Date(),
      status: 'COMPLETED',
      category: 'PORTAIS',
      brokerId: broker.id,
    }
  });

  console.log('Dummy data seeded successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
