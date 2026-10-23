import path from 'path';
import { prisma } from '../../prisma';
import { StorageService } from '../storage/StorageService';
import { LocalDiskStorage } from '../storage/LocalDiskStorage';
import { AuthUser, validateStoreAccess } from '../../middlewares/authMiddleware';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors/AppError';

export class PhotoService {
  private storage: StorageService;

  constructor(storage?: StorageService) {
    this.storage = storage || new LocalDiskStorage();
  }

  /**
   * Realiza o upload autenticado de foto associada a uma Resposta ou Plano de Ação
   */
  public async uploadPhoto(
    params: {
      fotoId: string;
      respostaId?: string;
      planoAcaoId?: string;
      buffer: Buffer;
      mimeType: string;
      originalName?: string;
    },
    user: AuthUser
  ) {
    const { fotoId, respostaId, planoAcaoId, buffer, mimeType } = params;

    if (!respostaId && !planoAcaoId) {
      throw new BadRequestError('A foto deve estar vinculada a uma resposta ou a um plano de ação');
    }

    // Validação de MIME Type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestError(`Formato de imagem não suportado: ${mimeType}. Formatos válidos: JPEG, PNG, WEBP.`);
    }

    let lojaId: string | null = null;
    let chaveRelativa = '';
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';

    if (respostaId) {
      const resposta = await prisma.resposta.findUnique({
        where: { id: respostaId },
        include: { execucao: true },
      });

      if (!resposta) {
        throw new NotFoundError(`Resposta ${respostaId} não encontrada para vincular a foto`);
      }

      lojaId = resposta.execucao.lojaId;
      chaveRelativa = `lojas/${lojaId}/execucoes/${resposta.execucao.id}/respostas/${respostaId}/${fotoId}.${ext}`;
    } else if (planoAcaoId) {
      const plano = await prisma.planoAcao.findUnique({
        where: { id: planoAcaoId },
      });

      if (!plano) {
        throw new NotFoundError(`Plano de ação ${planoAcaoId} não encontrado para vincular a evidência`);
      }

      lojaId = plano.lojaId;
      chaveRelativa = `lojas/${lojaId}/planos/${planoAcaoId}/evidencias/${fotoId}.${ext}`;
    }

    // Validação de autorização por loja
    if (!validateStoreAccess(user, lojaId)) {
      throw new ForbiddenError('Você não tem permissão para enviar fotos para esta loja');
    }

    // Salva arquivo no disco local com StorageService
    await this.storage.save(buffer, chaveRelativa);

    // Registra / atualiza metadados no PostgreSQL de forma idempotente
    const foto = await prisma.foto.upsert({
      where: { id: fotoId },
      update: {
        chaveRelativa,
        mimeType,
        tamanhoBytes: buffer.length,
      },
      create: {
        id: fotoId,
        respostaId: respostaId || null,
        planoAcaoId: planoAcaoId || null,
        chaveRelativa,
        mimeType,
        tamanhoBytes: buffer.length,
      },
    });

    return foto;
  }

  /**
   * Obtém a stream da foto com validação estrita de loja
   */
  public async getPhotoFile(fotoId: string, user: AuthUser) {
    const foto = await prisma.foto.findUnique({
      where: { id: fotoId },
      include: {
        resposta: { include: { execucao: true } },
        planoAcao: true,
      },
    });

    if (!foto) {
      throw new NotFoundError('Foto não encontrada');
    }

    const lojaId = foto.resposta?.execucao.lojaId || foto.planoAcao?.lojaId || null;

    // Regra RF05 e RF10: download restrito por loja
    if (!validateStoreAccess(user, lojaId)) {
      throw new ForbiddenError('Acesso negado: você não tem permissão para visualizar fotos de outra loja');
    }

    const exists = await this.storage.exists(foto.chaveRelativa);
    if (!exists) {
      throw new NotFoundError('Arquivo de foto não encontrado no disco');
    }

    const stream = this.storage.getStream(foto.chaveRelativa);

    return {
      stream,
      mimeType: foto.mimeType,
      tamanhoBytes: foto.tamanhoBytes,
    };
  }
}

