import { prisma } from './prisma';

export const PLAN_LIMITS = {
  TRIAL: {
    leadsGlobal: 50,
    propertiesGlobal: 10,
    ai: true,
    pdf: true,
  },
  BASIC: {
    leadsMonthly: 100,
    propertiesGlobal: 50,
    ai: false,
    pdf: false,
  },
  PREMIUM: {
    leadsMonthly: Infinity, // Ilimitado
    propertiesGlobal: Infinity, // Ilimitado
    ai: true,
    pdf: true,
  }
};

export async function checkLeadLimit(brokerId: string, planIdParam?: string): Promise<boolean> {
  const broker = await prisma.broker.findUnique({
    where: { id: brokerId },
    select: { planId: true, trialEndsAt: true }
  });

  if (!broker) return false;

  const planId = broker.planId;
  const isTrialExpired = planId === "TRIAL" && broker.trialEndsAt ? broker.trialEndsAt.getTime() < Date.now() : false;

  if (isTrialExpired) return false;

  if (planId === 'PREMIUM') return true;

  if (planId === 'TRIAL') {
    const totalLeads = await prisma.lead.count({ where: { brokerId } });
    return totalLeads < PLAN_LIMITS.TRIAL.leadsGlobal;
  }

  if (planId === 'BASIC') {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const leadsThisMonth = await prisma.lead.count({
      where: {
        brokerId,
        createdAt: { gte: startOfMonth }
      }
    });
    return leadsThisMonth < PLAN_LIMITS.BASIC.leadsMonthly;
  }

  return false;
}

export async function checkPropertyLimit(brokerId: string): Promise<boolean> {
  const broker = await prisma.broker.findUnique({
    where: { id: brokerId },
    select: { planId: true, trialEndsAt: true }
  });

  if (!broker) return false;

  const planId = broker.planId;
  const isTrialExpired = planId === "TRIAL" && broker.trialEndsAt ? broker.trialEndsAt.getTime() < Date.now() : false;

  if (isTrialExpired) return false;

  if (planId === 'PREMIUM') return true;

  const totalProperties = await prisma.property.count({ where: { brokerId } });

  if (planId === 'TRIAL') {
    return totalProperties < PLAN_LIMITS.TRIAL.propertiesGlobal;
  }

  if (planId === 'BASIC') {
    return totalProperties < PLAN_LIMITS.BASIC.propertiesGlobal;
  }

  return false;
}

export function canUseAI(planId: string): boolean {
  if (planId === 'PREMIUM') return PLAN_LIMITS.PREMIUM.ai;
  if (planId === 'TRIAL') return PLAN_LIMITS.TRIAL.ai;
  if (planId === 'BASIC') return PLAN_LIMITS.BASIC.ai;
  return false;
}

export function canGeneratePDF(planId: string): boolean {
  if (planId === 'PREMIUM') return PLAN_LIMITS.PREMIUM.pdf;
  if (planId === 'TRIAL') return PLAN_LIMITS.TRIAL.pdf;
  if (planId === 'BASIC') return PLAN_LIMITS.BASIC.pdf;
  return false;
}
