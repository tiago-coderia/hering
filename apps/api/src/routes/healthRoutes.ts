import { Router } from 'express';
import { prisma } from '../prisma';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  let dbStatus = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    dbStatus = 'disconnected';
  }

  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

