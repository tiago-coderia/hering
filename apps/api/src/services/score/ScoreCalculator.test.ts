import { describe, it, expect } from 'vitest';
import { ScoreCalculator, ItemParaCalculo } from './ScoreCalculator';

describe('ScoreCalculator (RF07 e RD03)', () => {
  it('deve calcular 100% quando todos os itens aplicáveis forem Conformes (C)', () => {
    const itens: ItemParaCalculo[] = [
      { obrigatorio: true, peso: 1, valor: 'C' },
      { obrigatorio: true, peso: 1, valor: 'C' },
      { obrigatorio: false, peso: 1, valor: 'C' },
    ];

    const resultado = ScoreCalculator.calcular(itens);
    expect(resultado.pontuacao).toBe(100);
    expect(resultado.podeFinalizar).toBe(true);
    expect(resultado.itensObrigatoriosSemResposta).toBe(0);
  });

  it('deve calcular conformidade simples de 50% quando pesos forem iguais a 1', () => {
    const itens: ItemParaCalculo[] = [
      { obrigatorio: true, peso: 1, valor: 'C' },
      { obrigatorio: true, peso: 1, valor: 'NC' },
    ];

    const resultado = ScoreCalculator.calcular(itens);
    expect(resultado.pontuacao).toBe(50);
  });

  it('deve ignorar itens Não se Aplica (NA) no numerador e no denominador', () => {
    const itens: ItemParaCalculo[] = [
      { obrigatorio: true, peso: 1, valor: 'C' },
      { obrigatorio: true, peso: 1, valor: 'NA' },
      { obrigatorio: false, peso: 1, valor: 'NA' },
    ];

    const resultado = ScoreCalculator.calcular(itens);
    // 1 item C (peso 1) / (1 item C peso 1) = 100%
    expect(resultado.pontuacao).toBe(100);
    expect(resultado.totalNaoSeAplica).toBe(2);
    expect(resultado.somaPesosDenominador).toBe(1);
  });

  it('deve calcular pontuação ponderada com pesos diferentes (RD03)', () => {
    const itens: ItemParaCalculo[] = [
      { obrigatorio: true, peso: 3, valor: 'C' },  // 3 no numerador, 3 no denominador
      { obrigatorio: true, peso: 1, valor: 'NC' }, // 0 no numerador, 1 no denominador
      // Total: 3 / 4 = 75%
    ];

    const resultado = ScoreCalculator.calcular(itens);
    expect(resultado.pontuacao).toBe(75);
    expect(resultado.somaPesosC).toBe(3);
    expect(resultado.somaPesosDenominador).toBe(4);
  });

  it('deve retornar pontuação null (não 100%) quando todos os itens forem NA', () => {
    const itens: ItemParaCalculo[] = [
      { obrigatorio: true, peso: 1, valor: 'NA' },
      { obrigatorio: false, peso: 2, valor: 'NA' },
    ];

    const resultado = ScoreCalculator.calcular(itens);
    expect(resultado.pontuacao).toBeNull();
    expect(resultado.somaPesosDenominador).toBe(0);
    expect(resultado.podeFinalizar).toBe(true);
  });

  it('deve bloquear finalização se houver item obrigatório sem resposta', () => {
    const itens: ItemParaCalculo[] = [
      { obrigatorio: true, peso: 1, valor: 'C' },
      { obrigatorio: true, peso: 1, valor: null }, // Obrigatório não respondido
    ];

    const resultado = ScoreCalculator.calcular(itens);
    expect(resultado.podeFinalizar).toBe(false);
    expect(resultado.itensObrigatoriosSemResposta).toBe(1);
  });

  it('deve permitir finalização se item não obrigatório estiver sem resposta', () => {
    const itens: ItemParaCalculo[] = [
      { obrigatorio: true, peso: 1, valor: 'C' },
      { obrigatorio: false, peso: 1, valor: null }, // Opcional sem resposta
    ];

    const resultado = ScoreCalculator.calcular(itens);
    expect(resultado.podeFinalizar).toBe(true);
    expect(resultado.itensObrigatoriosSemResposta).toBe(0);
    expect(resultado.pontuacao).toBe(100);
  });
});

