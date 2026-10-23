import { prisma } from '../../prisma';
import { AuthUser, validateStoreAccess } from '../../middlewares/authMiddleware';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors/AppError';
import { ScoreCalculator, ItemParaCalculo, ValorResposta } from '../score/ScoreCalculator';

export interface RespostaInput {
  id: string; // UUID gerado no cliente
  itemModeloId?: string;
  itemDescricaoSnapshot: string;
  itemOrdemSnapshot: number;
  itemObrigatorioSnapshot: boolean;
  itemPesoSnapshot?: number;
  valor: ValorResposta;
  observacao?: string | null;
  fotos?: Array<{
    id: string;
    mimeType: string;
    tamanhoBytes: number;
  }>;
  planoAcao?: {
    id: string;
    descricao?: string;
    responsavelId?: string;
    prazo?: string | Date;
  };
}

export interface ExecucaoInput {
  id: string; // UUID gerado no cliente
  versaoModeloId: string;
  lojaId: string;
  iniciadaEm: string | Date;
  finalizadaEm?: string | Date | null;
  status: 'RASCUNHO' | 'FINALIZADA';
  respostas: RespostaInput[];
}

export class ChecklistService {
  /**
   * Lista modelos disponíveis de acordo com o perfil do usuário
   */
  public static async listModelos(user: AuthUser) {
    if (user.cargo === 'Administrador') {
      return prisma.modeloChecklist.findMany({
        include: {
          versoes: {
            orderBy: { versao: 'desc' },
            include: {
              cargoPermitido: true,
              itens: { orderBy: { ordem: 'asc' } },
            },
          },
        },
        orderBy: { nome: 'asc' },
      });
    }

    // Para Gerente ou Operador: apenas modelos ativos com versões publicadas para seu cargo
    const cargo = await prisma.cargo.findUnique({
      where: { nome: user.cargo },
    });

    if (!cargo) return [];

    return prisma.modeloChecklist.findMany({
      where: {
        ativo: true,
        versoes: {
          some: {
            publicado: true,
            cargoPermitidoId: cargo.id,
          },
        },
      },
      include: {
        versoes: {
          where: {
            publicado: true,
            cargoPermitidoId: cargo.id,
          },
          orderBy: { versao: 'desc' },
          take: 1, // Versão ativa mais recente
          include: {
            cargoPermitido: true,
            itens: { orderBy: { ordem: 'asc' } },
          },
        },
      },
      orderBy: { nome: 'asc' },
    });
  }

  /**
   * Obtém detalhes de um modelo e sua versão
   */
  public static async getModeloById(id: string, user: AuthUser) {
    const modelo = await prisma.modeloChecklist.findUnique({
      where: { id },
      include: {
        versoes: {
          orderBy: { versao: 'desc' },
          include: {
            cargoPermitido: true,
            itens: { orderBy: { ordem: 'asc' } },
          },
        },
      },
    });

    if (!modelo) {
      throw new NotFoundError('Modelo de checklist não encontrado');
    }

    if (user.cargo !== 'Administrador') {
      const versaoPermitida = modelo.versoes.find(
        (v) => v.publicado && v.cargoPermitido.nome === user.cargo
      );

      if (!modelo.ativo || !versaoPermitida) {
        throw new ForbiddenError('Você não tem permissão para visualizar este modelo');
      }

      return {
        ...modelo,
        versoes: [versaoPermitida],
      };
    }

    return modelo;
  }

  /**
   * Criação de novo modelo e primeira versão (apenas Administrador)
   */
  public static async createModelo(
    data: {
      nome: string;
      descricao?: string;
      cargoPermitidoId: string;
      publicar?: boolean;
      itens: Array<{
        ordem: number;
        descricao: string;
        obrigatorio?: boolean;
        exigeFotoEmNC?: boolean;
        peso?: number;
      }>;
    },
    user: AuthUser
  ) {
    if (user.cargo !== 'Administrador') {
      throw new ForbiddenError('Apenas administradores podem criar modelos');
    }

    const publicar = data.publicar ?? true;

    return prisma.modeloChecklist.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        ativo: true,
        versoes: {
          create: {
            versao: 1,
            cargoPermitidoId: data.cargoPermitidoId,
            publicado: publicar,
            publicadoEm: publicar ? new Date() : null,
            itens: {
              create: data.itens.map((it, idx) => ({
                ordem: it.ordem ?? idx + 1,
                descricao: it.descricao,
                obrigatorio: it.obrigatorio ?? true,
                exigeFotoEmNC: it.exigeFotoEmNC ?? true,
                peso: it.peso ?? 1.0,
              })),
            },
          },
        },
      },
      include: {
        versoes: {
          include: {
            cargoPermitido: true,
            itens: { orderBy: { ordem: 'asc' } },
          },
        },
      },
    });
  }

  /**
   * Edição com versionamento imutável (RD01):
   * Se a versão atual já possui execuções ou está publicada, cria automaticamente uma nova versão incremental.
   */
  public static async updateModeloComVersionamento(
    modeloId: string,
    data: {
      nome?: string;
      descricao?: string;
      ativo?: boolean;
      cargoPermitidoId?: string;
      itens?: Array<{
        ordem: number;
        descricao: string;
        obrigatorio?: boolean;
        exigeFotoEmNC?: boolean;
        peso?: number;
      }>;
    },
    user: AuthUser
  ) {
    if (user.cargo !== 'Administrador') {
      throw new ForbiddenError('Apenas administradores podem alterar modelos');
    }

    const modelo = await prisma.modeloChecklist.findUnique({
      where: { id: modeloId },
      include: {
        versoes: {
          orderBy: { versao: 'desc' },
          include: {
            execucoes: { select: { id: true }, take: 1 },
          },
        },
      },
    });

    if (!modelo) {
      throw new NotFoundError('Modelo não encontrado');
    }

    // Atualiza metadados básicos do modelo
    await prisma.modeloChecklist.update({
      where: { id: modeloId },
      data: {
        ...(data.nome ? { nome: data.nome } : {}),
        ...(data.descricao !== undefined ? { descricao: data.descricao } : {}),
        ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
      },
    });

    // Se novos itens foram fornecidos, avalia se cria nova versão imutável
    if (data.itens && data.itens.length > 0) {
      const versaoMaisRecente = modelo.versoes[0];
      const temExecucoes = versaoMaisRecente && versaoMaisRecente.execucoes.length > 0;
      const cargoId = data.cargoPermitidoId || versaoMaisRecente?.cargoPermitidoId;

      if (!cargoId) {
        throw new BadRequestError('Cargo permitido não especificado para a versão');
      }

      if (temExecucoes || (versaoMaisRecente && versaoMaisRecente.publicado)) {
        // Cria uma nova versão imutável incremental
        const proximoNumero = (versaoMaisRecente?.versao || 0) + 1;
        await prisma.versaoModeloChecklist.create({
          data: {
            modeloId: modelo.id,
            versao: proximoNumero,
            cargoPermitidoId: cargoId,
            publicado: true,
            publicadoEm: new Date(),
            itens: {
              create: data.itens.map((it, idx) => ({
                ordem: it.ordem ?? idx + 1,
                descricao: it.descricao,
                obrigatorio: it.obrigatorio ?? true,
                exigeFotoEmNC: it.exigeFotoEmNC ?? true,
                peso: it.peso ?? 1.0,
              })),
            },
          },
        });
      } else if (versaoMaisRecente) {
        // Versão em rascunho sem execuções pode ser atualizada in-place
        await prisma.itemModeloChecklist.deleteMany({
          where: { versaoModeloId: versaoMaisRecente.id },
        });

        await prisma.itemModeloChecklist.createMany({
          data: data.itens.map((it, idx) => ({
            versaoModeloId: versaoMaisRecente.id,
            ordem: it.ordem ?? idx + 1,
            descricao: it.descricao,
            obrigatorio: it.obrigatorio ?? true,
            exigeFotoEmNC: it.exigeFotoEmNC ?? true,
            peso: it.peso ?? 1.0,
          })),
        });
      }
    }

    return this.getModeloById(modeloId, user);
  }

  /**
   * Ativar / Desativar modelo
   */
  public static async toggleAtivo(modeloId: string, ativo: boolean, user: AuthUser) {
    if (user.cargo !== 'Administrador') {
      throw new ForbiddenError('Apenas administradores podem ativar ou desativar modelos');
    }

    return prisma.modeloChecklist.update({
      where: { id: modeloId },
      data: { ativo },
    });
  }

  /**
   * Sincronização e persistência idempotente de Execuções (RF04, RF07, RF09)
   */
  public static async syncExecucoes(execucoes: ExecucaoInput[], user: AuthUser) {
    const resultados: Array<{ id: string; status: string; pontuacao: number | null }> = [];

    for (const exec of execucoes) {
      // 1. Validação de isolamento por loja
      if (!validateStoreAccess(user, exec.lojaId)) {
        throw new ForbiddenError(`Não autorizado a sincronizar execuções para a loja ${exec.lojaId}`);
      }

      // 2. Busca versão do modelo e valida autorização do cargo
      const versao = await prisma.versaoModeloChecklist.findUnique({
        where: { id: exec.versaoModeloId },
        include: {
          modelo: true,
          cargoPermitido: true,
          itens: { orderBy: { ordem: 'asc' } },
        },
      });

      if (!versao) {
        throw new NotFoundError(`Versão de modelo de checklist ${exec.versaoModeloId} não encontrada`);
      }

      if (user.cargo !== 'Administrador' && versao.cargoPermitido.nome !== user.cargo) {
        throw new ForbiddenError(`O cargo "${user.cargo}" não tem autorização para executar este checklist`);
      }

      // 3. Validação dos itens e respostas
      const itensCalculo: ItemParaCalculo[] = [];
      const respostasMap = new Map<string, RespostaInput>();
      for (const r of exec.respostas) {
        if (r.itemModeloId) {
          respostasMap.set(r.itemModeloId, r);
        }
      }

      for (const itemVersao of versao.itens) {
        const respostaCliente = respostasMap.get(itemVersao.id);
        const valor = respostaCliente?.valor ?? null;

        // Regra RF05: Item NC exige foto comprobatória
        if (valor === 'NC' && itemVersao.exigeFotoEmNC) {
          const fotos = respostaCliente?.fotos;
          if (!fotos || fotos.length === 0) {
            throw new BadRequestError(
              `O item "${itemVersao.descricao}" foi marcado como Não Conforme (NC) e exige foto obrigatória.`
            );
          }
        }

        itensCalculo.push({
          id: itemVersao.id,
          obrigatorio: itemVersao.obrigatorio,
          peso: itemVersao.peso,
          valor: valor,
        });
      }

      const calculo = ScoreCalculator.calcular(itensCalculo);

      if (exec.status === 'FINALIZADA' && !calculo.podeFinalizar) {
        throw new BadRequestError(
          `Não é possível finalizar a execução: existem ${calculo.itensObrigatoriosSemResposta} item(ns) obrigatório(s) sem resposta.`
        );
      }

      // 4. Busca responsável padrão da loja para planos de ação (Gerente da loja)
      const gerenteLoja = await prisma.usuario.findFirst({
        where: {
          lojaId: exec.lojaId,
          cargo: { nome: 'Gerente' },
          ativo: true,
        },
      });

      // 5. Transação Atômica Idempotente no PostgreSQL
      await prisma.$transaction(async (tx) => {
        // 5.1 Upsert da Execução (identificada pelo UUID gerado no cliente)
        const execucaoExistente = await tx.execucao.findUnique({
          where: { id: exec.id },
        });

        if (!execucaoExistente) {
          await tx.execucao.create({
            data: {
              id: exec.id,
              versaoModeloId: versao.id,
              modeloVersaoSnapshot: versao.versao,
              modeloNomeSnapshot: versao.modelo.nome,
              lojaId: exec.lojaId,
              usuarioId: user.id,
              status: exec.status,
              pontuacao: calculo.pontuacao,
              iniciadaEm: new Date(exec.iniciadaEm),
              finalizadaEm: exec.finalizadaEm ? new Date(exec.finalizadaEm) : null,
              sincronizadaEm: new Date(),
            },
          });
        } else if (execucaoExistente.status === 'RASCUNHO' && exec.status === 'FINALIZADA') {
          // Atualiza rascunho para finalizado de forma idempotente
          await tx.execucao.update({
            where: { id: exec.id },
            data: {
              status: exec.status,
              pontuacao: calculo.pontuacao,
              finalizadaEm: exec.finalizadaEm ? new Date(exec.finalizadaEm) : new Date(),
              sincronizadaEm: new Date(),
            },
          });
        }

        // 5.2 Processa Respostas
        for (const resp of exec.respostas) {
          const respExistente = await tx.resposta.findUnique({
            where: { id: resp.id },
          });

          if (!respExistente) {
            await tx.resposta.create({
              data: {
                id: resp.id,
                execucaoId: exec.id,
                itemModeloId: resp.itemModeloId || null,
                itemDescricaoSnapshot: resp.itemDescricaoSnapshot,
                itemOrdemSnapshot: resp.itemOrdemSnapshot,
                itemObrigatorioSnapshot: resp.itemObrigatorioSnapshot,
                itemPesoSnapshot: resp.itemPesoSnapshot ?? 1.0,
                valor: resp.valor,
                observacao: resp.observacao || null,
              },
            });
          }

          // 5.3 Metadados de fotos anexadas à resposta
          if (resp.fotos && resp.fotos.length > 0) {
            for (const f of resp.fotos) {
              const fotoExistente = await tx.foto.findUnique({
                where: { id: f.id },
              });

              if (!fotoExistente) {
                const ext = f.mimeType === 'image/png' ? 'png' : 'jpg';
                const chaveRelativa = `lojas/${exec.lojaId}/execucoes/${exec.id}/respostas/${resp.id}/${f.id}.${ext}`;

                await tx.foto.create({
                  data: {
                    id: f.id,
                    respostaId: resp.id,
                    chaveRelativa,
                    mimeType: f.mimeType,
                    tamanhoBytes: f.tamanhoBytes,
                  },
                });
              }
            }
          }

          // 5.4 Geração Automática de Plano de Ação para Não Conformidade (NC) (RF06)
          if (resp.valor === 'NC') {
            const planoExistente = await tx.planoAcao.findUnique({
              where: { respostaId: resp.id },
            });

            if (!planoExistente) {
              // Responsável: se fornecido no input, usa; senão usa o gerente da loja; se não houver gerente, usa o próprio usuário autenticado
              const responsavelId =
                resp.planoAcao?.responsavelId ||
                gerenteLoja?.id ||
                user.id;

              // Prazo: padrão +48 horas da data da resposta
              const prazoData = resp.planoAcao?.prazo
                ? new Date(resp.planoAcao.prazo)
                : new Date(Date.now() + 48 * 60 * 60 * 1000);

              const descricaoPlano =
                resp.planoAcao?.descricao ||
                `Correção de não conformidade no item: ${resp.itemDescricaoSnapshot}`;

              const planoId = resp.planoAcao?.id || `plano-${resp.id}`;

              await tx.planoAcao.create({
                data: {
                  id: planoId,
                  respostaId: resp.id,
                  lojaId: exec.lojaId,
                  descricao: descricaoPlano,
                  responsavelId: responsavelId,
                  prazo: prazoData,
                  status: 'ABERTO',
                  revisao: 1,
                },
              });
            }
          }
        }
      });

      resultados.push({
        id: exec.id,
        status: exec.status,
        pontuacao: calculo.pontuacao,
      });
    }

    return {
      sucesso: true,
      totalSincronizadas: resultados.length,
      execucoes: resultados,
    };
  }

  /**
   * Consulta histórico de execuções com autorização restrita por loja (RF10)
   */
  public static async listExecucoes(user: AuthUser, filtroLojaId?: string) {
    const whereLoja = user.cargo === 'Administrador'
      ? (filtroLojaId ? { lojaId: filtroLojaId } : {})
      : { lojaId: user.lojaId! };

    return prisma.execucao.findMany({
      where: whereLoja,
      include: {
        loja: { select: { id: true, codigo: true, nome: true } },
        usuario: { select: { id: true, nome: true, email: true } },
        _count: { select: { respostas: true } },
      },
      orderBy: { iniciadaEm: 'desc' },
    });
  }

  /**
   * Consulta detalhes de uma execução com verificação de loja (RF10)
   */
  public static async getExecucaoById(id: string, user: AuthUser) {
    const execucao = await prisma.execucao.findUnique({
      where: { id },
      include: {
        loja: true,
        usuario: { select: { id: true, nome: true, email: true, cargo: true } },
        versaoModelo: {
          include: {
            modelo: true,
            cargoPermitido: true,
          },
        },
        respostas: {
          orderBy: { itemOrdemSnapshot: 'asc' },
          include: {
            fotos: true,
            planoAcao: {
              include: {
                responsavel: { select: { id: true, nome: true, email: true } },
                fotos: true,
              },
            },
          },
        },
      },
    });

    if (!execucao) {
      throw new NotFoundError('Execução de checklist não encontrada');
    }

    if (!validateStoreAccess(user, execucao.lojaId)) {
      throw new ForbiddenError('Você não tem permissão para visualizar execuções de outra loja');
    }

    return execucao;
  }
}
