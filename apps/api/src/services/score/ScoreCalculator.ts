export type ValorResposta = 'C' | 'NC' | 'NA';

export interface ItemParaCalculo {
  id?: string;
  obrigatorio: boolean;
  peso: number;
  valor?: ValorResposta | null;
}

export interface ResultadoCalculoScore {
  pontuacao: number | null;
  totalItens: number;
  itensRespondidos: number;
  itensObrigatoriosSemResposta: number;
  podeFinalizar: boolean;
  totalConforme: number;
  totalNaoConforme: number;
  totalNaoSeAplica: number;
  somaPesosC: number;
  somaPesosDenominador: number;
}

export class ScoreCalculator {
  /**
   * Calcula a pontuação percentual de conformidade e valida itens obrigatórios.
   * Regra RF07 e RD03:
   *  - C: soma o peso no numerador e no denominador
   *  - NC: soma o peso no denominador (zero no numerador)
   *  - NA: não participa nem do numerador nem do denominador
   *  - Se denominador for 0: retorna null (nunca 100% artificial)
   *  - Itens obrigatórios sem resposta impedem a finalização da execução
   */
  public static calcular(itens: ItemParaCalculo[]): ResultadoCalculoScore {
    let totalItens = itens.length;
    let itensRespondidos = 0;
    let itensObrigatoriosSemResposta = 0;
    let totalConforme = 0;
    let totalNaoConforme = 0;
    let totalNaoSeAplica = 0;
    let somaPesosC = 0;
    let somaPesosDenominador = 0;

    for (const item of itens) {
      const peso = typeof item.peso === 'number' && item.peso > 0 ? item.peso : 1.0;
      const valor = item.valor;

      if (!valor) {
        if (item.obrigatorio) {
          itensObrigatoriosSemResposta++;
        }
        continue;
      }

      itensRespondidos++;

      switch (valor) {
        case 'C':
          totalConforme++;
          somaPesosC += peso;
          somaPesosDenominador += peso;
          break;
        case 'NC':
          totalNaoConforme++;
          somaPesosDenominador += peso;
          break;
        case 'NA':
          totalNaoSeAplica++;
          // NA não altera nem numerador nem denominador
          break;
      }
    }

    const podeFinalizar = itensObrigatoriosSemResposta === 0 && itensRespondidos > 0;

    let pontuacao: number | null = null;
    if (somaPesosDenominador > 0) {
      const score = (somaPesosC / somaPesosDenominador) * 100;
      pontuacao = Math.round(score * 100) / 100;
    }

    return {
      pontuacao,
      totalItens,
      itensRespondidos,
      itensObrigatoriosSemResposta,
      podeFinalizar,
      totalConforme,
      totalNaoConforme,
      totalNaoSeAplica,
      somaPesosC,
      somaPesosDenominador,
    };
  }
}

