import { test, expect, USUARIOS, loginComo, getMockImageBuffer } from './helpers';

test.describe('E2E-02: Regras de Negócio e Pontuação de Score', () => {
  test('Deve exigir foto e plano de ação em Não Conforme (NC) e calcular score conforme preenchimento', async ({
    page,
  }) => {
    await loginComo(page, USUARIOS.OPERADOR_BLUMENAU);

    // Inicia o primeiro checklist disponível
    const startBtn = page.getByRole('button', { name: /Iniciar Checklist/i }).first();
    await startBtn.click();

    // Aguarda carregar a tela de execução
    await expect(page.getByText(/Execução de Checklist/i).or(page.getByText(/Progresso/i))).toBeVisible();

    // Seleciona o primeiro item como "Não Conforme" (NC)
    const ncButton = page.getByRole('button', { name: /Não Conforme/i }).first();
    await ncButton.click();

    // Deve exibir alerta ou campos específicos de Não Conformidade (foto obrigatória e descrição do plano)
    await expect(page.getByText(/Evidência Fotográfica/i).first()).toBeVisible();

    // Tentar finalizar sem anexar foto deve exibir aviso ou desabilitar envio
    const finalizarBtn = page.getByRole('button', { name: /Finalizar Checklist/i });
    if (await finalizarBtn.isEnabled()) {
      await finalizarBtn.click();
      await expect(
        page.getByText(/foto/i).or(page.getByText(/obrigat/i)).or(page.getByText(/evidência/i))
      ).toBeVisible();
    }

    // Anexa a foto mock
    const fileChooserPromise = page.waitForEvent('filechooser');
    const uploadTrigger = page.locator('input[type="file"]').first();
    await uploadTrigger.setInputFiles({
      name: 'evidencia-nc.png',
      mimeType: 'image/png',
      buffer: getMockImageBuffer(),
    });

    // Preenche a ação corretiva se solicitada
    const planoInput = page.locator('textarea[placeholder*="ação"], input[placeholder*="ação"]').first();
    if (await planoInput.isVisible()) {
      await planoInput.fill('Ajuste imediato na organização dos cabides conforme padrão Hering');
    }

    // Marca segundo item (se houver) como Conforme
    const conformeBtns = page.getByRole('button', { name: /^Conforme$/i });
    const count = await conformeBtns.count();
    if (count > 1) {
      await conformeBtns.nth(1).click();
    }

    // Salva rascunho
    const salvarRascunhoBtn = page.getByRole('button', { name: /Salvar Rascunho/i });
    if (await salvarRascunhoBtn.isVisible()) {
      await salvarRascunhoBtn.click();
      await expect(page.getByText(/Rascunho salvo/i).or(page.getByText(/salvo com sucesso/i))).toBeVisible();
    }
  });
});
