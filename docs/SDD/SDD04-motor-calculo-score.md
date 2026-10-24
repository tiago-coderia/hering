# SDD 04: Motor de Cálculo de Pontuação e Conformidade (Score)

- **Identificador:** SDD-04
- **Fase:** Regra de Negócio Central
- **Commit Equivalente:** `aed39f3` (*feat(api): implementar ScoreCalculator com pesos, desconsideracao de NA e testes unitarios*)
- **Status:** Implementado e Testado

---

## 1. Contexto e Requisitos do Desafio

A auditoria de conformidade operacional das lojas Hering depende de um algoritmo matemático transparente e padronizado para cálculo do índice de conformidade (Score).

O desafio define formalmente:
1. Itens **Conformes (`C`)**: Contribuem positivamente no numerador e no denominador de acordo com seu peso (`peso`).
2. Itens **Não Conformes (`NC`)**: Contribuem com **zero** no numerador e entram integralmente no denominador (`peso`), penalizando a pontuação final.
3. Itens **Não se Aplica (`NA`)**: Devem ser **completamente expurgados** do cálculo (não somam no numerador e não somam no denominador).
4. **Caso de Borda Crítico:** Se todos os itens respondidos forem `NA`, o denominador torna-se zero. A pontuação não pode ser artificialmente 100% nem 0%; o valor formal no banco deve ser `null`, exibido no frontend explicitamente como `"N/A"`.
5. Itens obrigatórios não respondidos bloqueiam a finalização do checklist.

---

## 2. Decisões Arquiteturais e Implementação

### 2.1 Formulação Matemática Formal

$$\text{Score} = \begin{cases} 
\text{null}, & \text{se } \sum_{\text{itens válidos}} \text{peso}_i = 0 \\
\left( \frac{\sum_{i \in C} \text{peso}_i}{\sum_{i \in (C \cup NC)} \text{peso}_i} \right) \times 100, & \text{se } \sum_{\text{itens válidos}} \text{peso}_i > 0
\end{cases}$$

O resultado numérico é arredondado para duas casas decimais (`Math.round(score * 100) / 100`).

### 2.2 Implementação em `ScoreCalculator.ts`
Implementado em [`ScoreCalculator`](file:///p:/09.%20Testes/hering/apps/api/src/services/score/ScoreCalculator.ts):
```typescript
export interface ItemParaCalculo {
  itemId: string;
  peso: number;
  obrigatorio: boolean;
  resposta?: 'C' | 'NC' | 'NA';
}

export class ScoreCalculator {
  public static calcular(itens: ItemParaCalculo[]): {
    score: number | null;
    totalItens: number;
    conformes: number;
    naoConformes: number;
    naoAplica: number;
    denominadorValido: number;
  } {
    // Validação de obrigatoriedade
    const obrigatorioFaltante = itens.find(i => i.obrigatorio && !i.resposta);
    if (obrigatorioFaltante) {
      throw new BadRequestError(`Item obrigatório "${obrigatorioFaltante.itemId}" não foi respondido`);
    }

    let numerador = 0;
    let denominador = 0;
    // ...
    if (denominador === 0) {
      return { score: null, ...estatisticas };
    }

    const score = Math.round((numerador / denominador) * 10000) / 100;
    return { score, ...estatisticas };
  }
}
```

---

## 3. Cobertura de Testes Automatizados

Bateria de testes em Vitest [`scoreCalculator.test.ts`](file:///p:/09.%20Testes/hering/apps/api/src/tests/scoreCalculator.test.ts) validando:
- **100% de Conformidade:** Itens com pesos variados respondidos com `C` geram score `100.00`.
- **0% de Conformidade:** Itens respondidos com `NC` geram score `0.00`.
- **Pesos Ponderados:** Item peso 3 como `C` e item peso 1 como `NC` resultam exatamente em `75.00%`.
- **Desconsideração Estrita de `NA`:** Item `C` (peso 2), item `NC` (peso 2) e item `NA` (peso 5) resultam exatamente em `50.00%` (o peso 5 é ignorado).
- **Denominador Zero:** Três itens respondidos com `NA` retornam score `null`.
- **Bloqueio de Obrigatórios:** Tentativa de cálculo com item obrigatório ausente lança exceção com status 400.
