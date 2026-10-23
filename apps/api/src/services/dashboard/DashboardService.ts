import { prisma } from '../../prisma';
import { AuthUser } from '../../middlewares/authMiddleware';

export class DashboardService {
  /**
   * Obtém métricas gerenciais e ranking de conformidade por loja (RD02)
   */
  public static async getMetrics(user: AuthUser, filtroLojaId?: string) {
    const lojaIdAlvo = user.cargo === 'Administrador' ? filtroLojaId : user.lojaId;
    const now = new Date();

    // 1. Lojas a considerar
    const whereLoja = lojaIdAlvo ? { id: lojaIdAlvo } : { ativo: true };
    const lojas = await prisma.loja.findMany({
      where: whereLoja,
      select: { id: true, codigo: true, nome: true, cidade: true, uf: true },
    });

    const rankingLojas: Array<{
      lojaId: string;
      codigo: string;
      nome: string;
      cidade: string;
      uf: string;
      totalExecucoes: number;
      mediaPontuacao: number | null;
      planosAbertos: number;
      planosAtrasados: number;
    }> = [];

    let totalExecucoesGeral = 0;
    let totalPlanosAbertosGeral = 0;
    let totalPlanosAtrasadosGeral = 0;

    for (const l of lojas) {
      // Execuções da loja
      const execucoes = await prisma.execucao.findMany({
        where: {
          lojaId: l.id,
          status: 'FINALIZADA',
          pontuacao: { not: null },
        },
        select: { pontuacao: true },
      });

      const totalExec = execucoes.length;
      totalExecucoesGeral += totalExec;

      let media: number | null = null;
      if (totalExec > 0) {
        const soma = execucoes.reduce((acc, curr) => acc + (curr.pontuacao || 0), 0);
        media = Math.round((soma / totalExec) * 100) / 100;
      }

      // Planos de ação da loja
      const planos = await prisma.planoAcao.findMany({
        where: { lojaId: l.id },
        select: { status: true, prazo: true },
      });

      const planosAbertos = planos.filter((p) => p.status !== 'CONCLUIDO').length;
      const planosAtrasados = planos.filter(
        (p) => p.status !== 'CONCLUIDO' && new Date(p.prazo) < now
      ).length;

      totalPlanosAbertosGeral += planosAbertos;
      totalPlanosAtrasadosGeral += planosAtrasados;

      rankingLojas.push({
        lojaId: l.id,
        codigo: l.codigo,
        nome: l.nome,
        cidade: l.cidade,
        uf: l.uf,
        totalExecucoes: totalExec,
        mediaPontuacao: media,
        planosAbertos,
        planosAtrasados,
      });
    }

    // Ordena ranking por maior média de pontuação
    rankingLojas.sort((a, b) => {
      if (a.mediaPontuacao === null) return 1;
      if (b.mediaPontuacao === null) return -1;
      return b.mediaPontuacao - a.mediaPontuacao;
    });

    return {
      totais: {
        totalExecucoes: totalExecucoesGeral,
        totalPlanosAbertos: totalPlanosAbertosGeral,
        totalPlanosAtrasados: totalPlanosAtrasadosGeral,
      },
      rankingLojas,
    };
  }
}

