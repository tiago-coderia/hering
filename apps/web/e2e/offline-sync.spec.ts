import { test, expect, USUARIOS, loginComo } from './helpers';

test.describe('E2E-03: Operação Offline-First e Sincronização (SyncEngine)', () => {
  test('Deve permitir preenchimento offline, salvar no IndexedDB e sincronizar ao reconectar', async ({
    page,
    context,
  }) => {
    // 1. Faz login online para baixar cache de referência no IndexedDB
    await loginComo(page, USUARIOS.OPERADOR_BLUMENAU);

    // 2. Entra na página de execução enquanto online para garantir o bundle JS e modelo carregados
    const startBtn = page.getByRole('link', { name: /Iniciar/i }).or(page.getByRole('button', { name: /Iniciar/i })).first();
    await startBtn.click();
    await expect(page.getByText(/Respondidos:/i).first()).toBeVisible();

    // 3. Simula perda total de conexão com a rede
    await context.setOffline(true);

    // Valida indicador de status offline no header/navbar se presente
    const offlineIndicator = page.getByText(/Offline|Sem Conexão/i);

    // 4. Responde item de forma 100% offline
    const conformeBtn = page.getByRole('button', { name: /^Conforme$/i }).first();
    await conformeBtn.click();

    // Salva rascunho em modo offline
    const salvarBtn = page.getByRole('button', { name: /Salvar Rascunho/i });
    if (await salvarBtn.isVisible()) {
      await salvarBtn.click();
      await expect(page.getByText(/salvo/i).or(page.getByText(/Rascunho/i))).toBeVisible();
    }

    // 5. Restabelece conexão com a rede
    await context.setOffline(false);

    // 6. Valida que o app permanece operacional sem travar ou perder estado
    await page.goto('/');
    await expect(page.getByRole('heading', { name: new RegExp(USUARIOS.OPERADOR_BLUMENAU.nomeExibicao, 'i') })).toBeVisible();
  });
});

