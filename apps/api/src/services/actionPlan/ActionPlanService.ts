import { prisma } from '../../prisma';
import { AuthUser, validateStoreAccess } from '../../middlewares/authMiddleware';
import { BadRequestError, ForbiddenError, NotFoundError, ConflictError } from '../../errors/AppError';

export interface AtualizarPlanoAcaoInput {
  status?: 'ABERTO' | 'EM_ANDAMENTO' | 'CONCLUIDO';
  descricao?: string;
  responsavelId?: string;
  prazo?: string | Date;
  observacaoConclusao?: string;
  revisaoEsperada: number; // Controle de revisão para detecção de conflitos 409
}

export class ActionPlanService {
  /**
   * Lista planos de ação com filtros e isolamento de loja
   */
  public static async listPlanos(
    user: AuthUser,
    filtros?: {
      lojaId?: string;
      status?: string;
    }
  ) {
    const whereLoja = user.cargo === 'Administrador'
      ? (filtros?.lojaId ? { lojaId: filtros.lojaId } : {})
      : { lojaId: user.lojaId! };

    const whereStatus = filtros?.status ? { status: filtros.status } : {};

    return prisma.planoAcao.findMany({
      where: {
        ...whereLoja,
        ...whereStatus,
      },
      include: {
        loja: { select: { id: true, codigo: true, nome: true } },
        responsavel: { select: { id: true, nome: true, email: true } },
        resposta: {
          select: {
            id: true,
            itemDescricaoSnapshot: true,
            itemOrdemSnapshot: true,
            valor: true,
            execucao: {
              select: {
                id: true,
                modeloNomeSnapshot: true,
                iniciadaEm: true,
              },
            },
          },
        },
        fotos: true,
      },
      orderBy: [{ prazo: 'asc' }, { criadoEm: 'desc' }],
    });
  }

  /**
   * Obtém detalhes de um plano de ação
   */
  public static async getPlanoById(id: string, user: AuthUser) {
    const plano = await prisma.planoAcao.findUnique({
      where: { id },
      include: {
        loja: true,
        responsavel: { select: { id: true, nome: true, email: true } },
        resposta: {
          include: {
            fotos: true,
            execucao: true,
          },
        },
        fotos: true,
      },
    });

    if (!plano) {
      throw new NotFoundError('Plano de ação não encontrado');
    }

    if (!validateStoreAccess(user, plano.lojaId)) {
      throw new ForbiddenError('Você não tem permissão para acessar planos de ação de outra loja');
    }

    return plano;
  }

  /**
   * Atualização com controle de revisão e concorrência (HTTP 409 Conflict)
   */
  public static async updatePlano(
    id: string,
    dados: AtualizarPlanoAcaoInput,
    user: AuthUser
  ) {
    const planoAtual = await prisma.planoAcao.findUnique({
      where: { id },
      include: {
        fotos: true,
      },
    });

    if (!planoAtual) {
      throw new NotFoundError('Plano de ação não encontrado');
    }

    // Validação de isolamento por loja
    if (!validateStoreAccess(user, planoAtual.lojaId)) {
      throw new ForbiddenError('Apenas usuários autorizados da loja ou administradores podem alterar o plano');
    }

    // Regra explícita de conflito de revisão:
    if (planoAtual.revisao !== dados.revisaoEsperada) {
      throw new ConflictError(
        'Conflito de versão detectado. O plano de ação foi alterado no servidor por outro usuário ou dispositivo.',
        {
          revisaoServidor: planoAtual.revisao,
          revisaoCliente: dados.revisaoEsperada,
          planoServidor: planoAtual,
        }
      );
    }

    // Se estiver marcando como CONCLUIDO, valida permissão e evidência fotográfica
    if (dados.status === 'CONCLUIDO') {
      if (user.cargo === 'Operador') {
        throw new ForbiddenError('Apenas Gerentes ou Administradores podem concluir planos de ação');
      }

      // Regra RF06: Exigir evidência fotográfica da correção para concluir o plano
      if (planoAtual.fotos.length === 0) {
        throw new BadRequestError(
          'É obrigatório anexar pelo menos uma foto de evidência da correção antes de concluir o plano de ação.'
        );
      }
    }

    const novoStatus = dados.status ?? planoAtual.status;
    const concluidoEm = novoStatus === 'CONCLUIDO' ? (planoAtual.concluidoEm || new Date()) : null;

    return prisma.planoAcao.update({
      where: { id },
      data: {
        ...(dados.descricao ? { descricao: dados.descricao } : {}),
        ...(dados.responsavelId ? { responsavelId: dados.responsavelId } : {}),
        ...(dados.prazo ? { prazo: new Date(dados.prazo) } : {}),
        ...(dados.observacaoConclusao !== undefined ? { observacaoConclusao: dados.observacaoConclusao } : {}),
        status: novoStatus,
        concluidoEm: concluidoEm,
        revisao: planoAtual.revisao + 1, // Incrementa versão de revisão
      },
      include: {
        loja: true,
        responsavel: { select: { id: true, nome: true, email: true } },
        fotos: true,
      },
    });
  }
}

