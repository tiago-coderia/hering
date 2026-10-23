import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError';

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  cargo: 'Administrador' | 'Gerente' | 'Operador';
  lojaId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticateToken(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if ((req as any).cookies && (req as any).cookies.token) {
    token = (req as any).cookies.token;
  }

  if (!token) {
    throw new UnauthorizedError('Token de autenticação não fornecido');
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthUser;
    req.user = payload;
    next();
  } catch (error) {
    throw new UnauthorizedError('Token inválido ou expirado');
  }
}

export function requireRole(...allowedRoles: Array<'Administrador' | 'Gerente' | 'Operador'>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (!allowedRoles.includes(req.user.cargo)) {
      throw new ForbiddenError(`O perfil "${req.user.cargo}" não tem permissão para acessar esta funcionalidade`);
    }

    next();
  };
}

export function validateStoreAccess(user: AuthUser, targetStoreId: string | null | undefined): boolean {
  // Administrador tem acesso global a todas as lojas
  if (user.cargo === 'Administrador') {
    return true;
  }

  // Gerente e Operador só podem acessar recursos da própria loja
  if (!targetStoreId || !user.lojaId) {
    return false;
  }

  return user.lojaId === targetStoreId;
}

