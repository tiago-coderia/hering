import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware';
import { BadRequestError } from '../errors/AppError';

export const storeRouter = Router();

const createLojaSchema = z.object({
  codigo: z.string().min(2, 'O código deve ter pelo menos 2 caracteres'),
  nome: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  cidade: z.string().min(2, 'A cidade é obrigatória'),
  uf: z.string().length(2, 'A UF deve ter 2 caracteres'),
});

storeRouter.use(authenticateToken);

storeRouter.get('/', async (req, res, next) => {
  try {
    const user = req.user!;
    const where = user.cargo === 'Administrador' ? {} : { id: user.lojaId! };

    const lojas = await prisma.loja.findMany({
      where,
      orderBy: { nome: 'asc' },
    });

    res.json(lojas);
  } catch (error) {
    next(error);
  }
});

storeRouter.post('/', requireRole('Administrador'), async (req, res, next) => {
  try {
    const dados = createLojaSchema.parse(req.body);

    const codigoExistente = await prisma.loja.findUnique({
      where: { codigo: dados.codigo },
    });

    if (codigoExistente) {
      throw new BadRequestError(`Já existe uma loja cadastrada com o código "${dados.codigo}"`);
    }

    const novaLoja = await prisma.loja.create({
      data: {
        codigo: dados.codigo,
        nome: dados.nome,
        cidade: dados.cidade,
        uf: dados.uf.toUpperCase(),
        ativo: true,
      },
    });

    res.status(201).json(novaLoja);
  } catch (error) {
    next(error);
  }
});

