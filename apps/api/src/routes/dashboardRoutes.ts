import { Router } from 'express';
import { DashboardService } from '../services/dashboard/DashboardService';
import { authenticateToken } from '../middlewares/authMiddleware';

export const dashboardRouter = Router();

dashboardRouter.use(authenticateToken);

dashboardRouter.get('/', async (req, res, next) => {
  try {
    const filtroLojaId = req.query.lojaId as string | undefined;
    const metrics = await DashboardService.getMetrics(req.user!, filtroLojaId);
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

