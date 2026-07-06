import { prisma } from './src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log("Apagando todos os brokers existentes...");
  await prisma.lead.deleteMany();
  await prisma.broker.deleteMany();

  const passwordHash = await bcrypt.hash("123456", 12);

  console.log("Criando conta 1: Trial Novo");
  await prisma.broker.create({
    data: {
      name: "Corretor Trial",
      email: "trial@teste.com",
      passwordHash,
      planId: "TRIAL",
      trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // +3 dias
    }
  });

  console.log("Criando conta 2: Trial Expirado");
  await prisma.broker.create({
    data: {
      name: "Corretor Expirado",
      email: "expirado@teste.com",
      passwordHash,
      planId: "TRIAL",
      trialEndsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // -1 dia
    }
  });

  console.log("Criando conta 3: Básico");
  await prisma.broker.create({
    data: {
      name: "Corretor Básico",
      email: "basico@teste.com",
      passwordHash,
      planId: "BASIC",
    }
  });

  console.log("Criando conta 4: Premium");
  await prisma.broker.create({
    data: {
      name: "Corretor Premium",
      email: "premium@teste.com",
      passwordHash,
      planId: "PREMIUM",
    }
  });

  console.log("Contas de teste criadas com sucesso! Senha para todas: 123456");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
