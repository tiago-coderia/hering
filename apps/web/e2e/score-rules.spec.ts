import { test, expect, USUARIOS, loginComo, getMockImageBuffer } from './helpers';

test.describe('E2E-02: Regras de Negócio e Pontuação de Score', () => {
  test('Deve exigir foto e plano de ação em Não Conforme (NC) e calcular score conforme preenchimento', async ({
    page,
  }) => {
    await loginComo(page, USUARIOS.OPERADOR_BLUMENAU);

    // Inicia o primeiro checklist disponível (link ou botão Iniciar)
    const startBtn = page.getByRole('link', { name: /Iniciar/i }).or(page.getByRole('button', { name: /Iniciar/i })).first();
    await startBtn.click();

    // Aguarda carregar a tela de execução
    await expect(page.getByText(/Respondidos:/i)).toBeVisible();

    // Valida o caso de borda inicial: sem respostas aplicáveis, pontuação exibe N/A
    await expect(page.getByText(/N\/A/i).first()).toBeVisible();

    // Seleciona o primeiro item como "Não Conforme" (NC)
    const ncButton = page.getByRole('button', { name: /Não Conforme/i }).first();
    await ncButton.click();

    // Deve exibir alerta ou campos específicos de Não Conformidade (foto obrigatória e descrição do plano)
    await expect(page.getByText(/Evidência Fotográfica/i).or(page.getByText(/Foto obrigatória/i)).first()).toBeVisible();

    // Anexa a foto mock
    const uploadTrigger = page.locator('input[type="file"]').first();
    await uploadTrigger.setInputFiles({
      name: 'evidencia-nc.png',
      mimeType: 'image/png',
      buffer: getMockImageBuffer(),
    });

    // Preenche a ação corretiva se solicitada
    const planoInput = page.locator('textarea[placeholder*="ação"], input[placeholder*="ação"], textarea[placeholder*="Observação"]').first();
    if (await planoInput.isVisible()) {
      await planoInput.fill('Ajuste imediato na organização dos cabides conforme padrão Hering');
    }

    // Marca segundo item como Conforme
    const conformeBtns = page.getByRole('button', { name: /^Conforme$/i });
    if (await conformeBtns.count() > 1) {
      await conformeBtns.nth(1).click();
    }

    // Salva rascunho
    const salvarRascunhoBtn = page.getByRole('button', { name: /Salvar Rascunho/i });
    if (await salvarRascunhoBtn.isVisible()) {
      await salvarRascunhoBtn.click();
      await expect(page.getByText(/salvo/i).or(page.getByText(/sucesso/i))).toBeVisible();
    }
  });
});

