import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';
import { config } from '../config';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Erros operacionais conhecidos da aplicação
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      statusCode: err.statusCode,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Erros de validação do Zod
  if (err instanceof ZodError) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'Dados de requisição inválidos',
      issues: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Log de erros inesperados
  console.error('[Unhandled Error]', err);

  res.status(500).json({
    status: 'error',
    statusCode: 500,
    message: 'Erro interno no servidor',
    ...(config.env === 'development' ? { stack: err.stack } : {}),
  });
}

