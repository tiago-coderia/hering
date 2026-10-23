import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { PhotoService } from '../services/photo/PhotoService';
import { authenticateToken } from '../middlewares/authMiddleware';
import { BadRequestError } from '../errors/AppError';
import { config } from '../config';

export const photoRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
  },
});

const photoService = new PhotoService();

photoRouter.use(authenticateToken);

const uploadBodySchema = z.object({
  fotoId: z.string().min(1, 'ID da foto obrigatório'),
  respostaId: z.string().optional(),
  planoAcaoId: z.string().optional(),
});

photoRouter.post(
  '/upload',
  upload.single('foto'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new BadRequestError('Nenhum arquivo enviado no campo "foto"');
      }

      const { fotoId, respostaId, planoAcaoId } = uploadBodySchema.parse(req.body);

      const resultado = await photoService.uploadPhoto(
        {
          fotoId,
          respostaId,
          planoAcaoId,
          buffer: req.file.buffer,
          mimeType: req.file.mimetype,
          originalName: req.file.originalname,
        },
        req.user!
      );

      res.status(201).json(resultado);
    } catch (error) {
      next(error);
    }
  }
);

photoRouter.get('/:id', async (req, res, next) => {
  try {
    const { stream, mimeType, tamanhoBytes } = await photoService.getPhotoFile(
      req.params.id,
      req.user!
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', tamanhoBytes);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
});

