import { Router } from 'express';
import { z } from 'zod';
import { ActionPlanService } from '../services/actionPlan/ActionPlanService';
import { authenticateToken } from '../middlewares/authMiddleware';

export const actionPlanRouter = Router();

actionPlanRouter.use(authenticateToken);

const updatePlanoSchema = z.object({
  status: z.enum(['ABERTO', 'EM_ANDAMENTO', 'CONCLUIDO']).optional(),
  descricao: z.string().optional(),
  responsavelId: z.string().optional(),
  prazo: z.string().optional(),
  observacaoConclusao: z.string().optional(),
  revisaoEsperada: z.number().int({ message: 'revisaoEsperada é obrigatória para controle de concorrência' }),
});

actionPlanRouter.get('/', async (req, res, next) => {
  try {
    const filtros = {
      lojaId: req.query.lojaId as string | undefined,
      status: req.query.status as string | undefined,
    };
    const planos = await ActionPlanService.listPlanos(req.user!, filtros);
    res.json(planos);
  } catch (error) {
    next(error);
  }
});

actionPlanRouter.get('/:id', async (req, res, next) => {
  try {
    const plano = await ActionPlanService.getPlanoById(req.params.id, req.user!);
    res.json(plano);
  } catch (error) {
    next(error);
  }
});

actionPlanRouter.patch('/:id', async (req, res, next) => {
  try {
    const dados = updatePlanoSchema.parse(req.body);
    const atualizado = await ActionPlanService.updatePlano(
      req.params.id,
      dados,
      req.user!
    );
    res.json(atualizado);
  } catch (error) {
    next(error);
  }
});

