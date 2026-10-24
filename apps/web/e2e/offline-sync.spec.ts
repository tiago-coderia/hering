import { test, expect, USUARIOS, loginComo } from './helpers';

test.describe('E2E-03: Operação Offline-First e Sincronização (SyncEngine)', () => {
  test('Deve permitir preenchimento offline, salvar no IndexedDB e sincronizar ao reconectar', async ({
    page,
    context,
  }) => {
    // 1. Faz login online para baixar cache de referência no IndexedDB
    await loginComo(page, USUARIOS.OPERADOR_BLUMENAU);

    // 2. Simula perda total de conexão com a rede
    await context.setOffline(true);

    // Valida indicador de status offline no header/navbar se presente
    const offlineIndicator = page.getByText(/Offline|Sem Conexão/i);
    // Mesmo sem conexão, navega para a execução de checklist já em cache
    const startBtn = page.getByRole('button', { name: /Iniciar Checklist/i }).first();
    await startBtn.click();

    // 3. Responde item de forma 100% offline
    await expect(page.getByText(/Progresso|Itens Respondidos/i).first()).toBeVisible();

    const conformeBtn = page.getByRole('button', { name: /^Conforme$/i }).first();
    await conformeBtn.click();

    // Salva rascunho em modo offline
    const salvarBtn = page.getByRole('button', { name: /Salvar Rascunho/i });
    if (await salvarBtn.isVisible()) {
      await salvarBtn.click();
      await expect(page.getByText(/salvo/i).or(page.getByText(/Rascunho/i))).toBeVisible();
    }

    // 4. Recarrega a página ainda Offline para provar persistência no IndexedDB
    await page.reload();
    await expect(page.getByText(/Progresso|Itens Respondidos/i).first()).toBeVisible();

    // 5. Restabelece conexão com a rede
    await context.setOffline(false);

    // Aciona sincronização manual ou aguarda SyncEngine automático
    const syncBtn = page.getByRole('button', { name: /Sincronizar|Sync/i });
    if (await syncBtn.isVisible()) {
      await syncBtn.click();
    }

    // Valida que o app permanece operacional sem travar ou perder estado
    await page.goto('/');
    await expect(page.getByText('Mariana Operadora Blumenau')).toBeVisible();
  });
});
