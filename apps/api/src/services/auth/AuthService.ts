import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';
import { config } from '../../config';
import { UnauthorizedError } from '../../errors/AppError';

export class AuthService {
  public static async login(email: string, senha: string) {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: {
        cargo: true,
        loja: true,
      },
    });

    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedError('Credenciais inválidas ou usuário inativo');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

    const payload = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cargo: usuario.cargo.nome as 'Administrador' | 'Gerente' | 'Operador',
      lojaId: usuario.lojaId,
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as any,
    });

    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        cargo: usuario.cargo.nome,
        lojaId: usuario.lojaId,
        lojaNome: usuario.loja?.nome ?? null,
      },
    };
  }

  public static async getMe(userId: string) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        cargo: true,
        loja: true,
      },
    });

    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedError('Usuário não encontrado ou inativo');
    }

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cargo: usuario.cargo.nome,
      lojaId: usuario.lojaId,
      lojaNome: usuario.loja?.nome ?? null,
    };
  }
}
