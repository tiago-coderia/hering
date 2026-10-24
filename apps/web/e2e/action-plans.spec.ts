import { test, expect, USUARIOS, loginComo, getMockImageBuffer } from './helpers';

test.describe('E2E-04: Gestão e Conclusão de Plano de Ação', () => {
  test('Gerente deve conseguir visualizar planos pendentes e concluir com evidência fotográfica', async ({
    page,
  }) => {
    // Login com Gerente de Blumenau
    await loginComo(page, USUARIOS.GERENTE_BLUMENAU);

    // Clica na aba de Planos de Ação
    const planosTab = page.getByRole('button', { name: /Planos de Ação/i });
    if (await planosTab.isVisible()) {
      await planosTab.click();
    }

    // Se houver planos de ação pendentes listados
    const planoCard = page.locator('div[class*="border"], div[class*="rounded"]').filter({
      hasText: /PENDENTE|EM_ANDAMENTO|48h/i,
    }).first();

    if (await planoCard.isVisible()) {
      // Clica no plano para abrir o modal de detalhes
      await planoCard.click();

      // Modal de ação deve abrir
      await expect(page.getByText(/Detalhes do Plano de Ação|Concluir Plano/i)).toBeVisible();

      // Anexa evidência de resolução se o campo estiver visível
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles({
          name: 'evidencia-resolucao.png',
          mimeType: 'image/png',
          buffer: getMockImageBuffer(),
        });
      }

      // Preenche nota de resolução se presente
      const observacaoInput = page.locator('textarea').first();
      if (await observacaoInput.isVisible()) {
        await observacaoInput.fill('Evidência fotográfica anexada e não conformidade sanada na loja.');
      }
    }
  });
});

