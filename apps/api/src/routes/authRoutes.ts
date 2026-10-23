import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth/AuthService';
import { authenticateToken } from '../middlewares/authMiddleware';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email('E-mail em formato inválido'),
  senha: z.string().min(1, 'A senha é obrigatória'),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, senha } = loginSchema.parse(req.body);
    const resultado = await AuthService.login(email, senha);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const resultado = await AuthService.getMe(req.user!.id);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

