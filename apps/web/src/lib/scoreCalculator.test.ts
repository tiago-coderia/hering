import { describe, it, expect } from 'vitest';
import { ScoreCalculator, ItemParaCalculo } from './scoreCalculator';

describe('ScoreCalculator no Frontend (PWA)', () => {
  it('deve calcular 100% quando todos os itens forem Conformes (C)', () => {
    const itens: ItemParaCalculo[] = [
      { obrigatorio: true, peso: 1, valor: 'C' },
      { obrigatorio: false, peso: 1, valor: 'C' },
    ];
    const resultado = ScoreCalculator.calcular(itens);
    expect(resultado.pontuacao).toBe(100);
    expect(resultado.podeFinalizar).toBe(true);
  });

  it('deve ignorar NA e calcular proporção correta com pesos', () => {
    const itens: ItemParaCalculo[] = [
      { obrigatorio: true, peso: 2, valor: 'C' },
      { obrigatorio: true, peso: 2, valor: 'NC' },
      { obrigatorio: false, peso: 5, valor: 'NA' },
    ];
    // 2 / (2 + 2) = 50%
    const resultado = ScoreCalculator.calcular(itens);
    expect(resultado.pontuacao).toBe(50);
    expect(resultado.totalNaoSeAplica).toBe(1);
  });

  it('deve bloquear finalização se faltar resposta obrigatória', () => {
    const itens: ItemParaCalculo[] = [
      { obrigatorio: true, peso: 1, valor: null },
    ];
    const resultado = ScoreCalculator.calcular(itens);
    expect(resultado.podeFinalizar).toBe(false);
  });
});

