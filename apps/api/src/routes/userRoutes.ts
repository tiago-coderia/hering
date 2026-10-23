import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware';
import { BadRequestError } from '../errors/AppError';

export const userRouter = Router();

const createUsuarioSchema = z.object({
  nome: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  cargoId: z.string().uuid('ID do cargo inválido'),
  lojaId: z.string().uuid('ID da loja inválido').optional().nullable(),
});

userRouter.use(authenticateToken);

userRouter.get('/cargos', async (_req, res, next) => {
  try {
    const cargos = await prisma.cargo.findMany({
      orderBy: { nome: 'asc' },
    });
    res.json(cargos);
  } catch (error) {
    next(error);
  }
});

userRouter.get('/', async (req, res, next) => {
  try {
    const user = req.user!;
    const where = user.cargo === 'Administrador'
      ? {}
      : { lojaId: user.lojaId! };

    const usuarios = await prisma.usuario.findMany({
      where,
      select: {
        id: true,
        nome: true,
        email: true,
        cargoId: true,
        lojaId: true,
        ativo: true,
        criadoEm: true,
        cargo: { select: { id: true, nome: true } },
        loja: { select: { id: true, codigo: true, nome: true } },
      },
      orderBy: { nome: 'asc' },
    });

    res.json(usuarios);
  } catch (error) {
    next(error);
  }
});

userRouter.post('/', requireRole('Administrador'), async (req, res, next) => {
  try {
    const dados = createUsuarioSchema.parse(req.body);

    const emailExistente = await prisma.usuario.findUnique({
      where: { email: dados.email },
    });

    if (emailExistente) {
      throw new BadRequestError(`Já existe um usuário com o e-mail "${dados.email}"`);
    }

    const senhaHash = await bcrypt.hash(dados.senha, 10);

    const novoUsuario = await prisma.usuario.create({
      data: {
        nome: dados.nome,
        email: dados.email,
        senhaHash,
        cargoId: dados.cargoId,
        lojaId: dados.lojaId || null,
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        cargoId: true,
        lojaId: true,
        ativo: true,
        cargo: { select: { id: true, nome: true } },
        loja: { select: { id: true, codigo: true, nome: true } },
      },
    });

    res.status(201).json(novoUsuario);
  } catch (error) {
    next(error);
  }
});

