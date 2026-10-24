import { test, expect, USUARIOS, loginComo } from './helpers';

test.describe('E2E-01: Autenticação e Perfis (RBAC)', () => {
  test('Deve realizar login com Administrador e acessar visão gerencial global', async ({ page }) => {
    await loginComo(page, USUARIOS.ADMIN);

    // Valida que o nome do usuário está visível
    await expect(page.getByText('Administrador Global')).toBeVisible();

    // Valida que o Administrador tem acesso ao botão "Modelos" no menu de navegação
    await expect(page.getByRole('link', { name: /Modelos/i })).toBeVisible();

    // Valida presença dos cards de ranking de lojas (visão global)
    await expect(page.getByText(/Ranking de Conformidade por Loja/i)).toBeVisible();
  });

  test('Deve realizar login com Gerente e ver apenas a sua loja (Blumenau)', async ({ page }) => {
    await loginComo(page, USUARIOS.GERENTE_BLUMENAU);

    await expect(page.getByText('Carlos Gerente Blumenau')).toBeVisible();
    await expect(page.getByText('Hering Blumenau Centro')).toBeVisible();

    // Gerente NÃO deve ver o link "Modelos" de gestão administrativa no menu
    await expect(page.getByRole('link', { name: /Modelos/i })).not.toBeVisible();

    // Gerente vê as abas de Modelos, Planos de Ação e Histórico
    await expect(page.getByRole('button', { name: /Planos de Ação/i })).toBeVisible();
  });

  test('Deve realizar login com Operador e exibir checklists disponíveis para execução', async ({ page }) => {
    await loginComo(page, USUARIOS.OPERADOR_BLUMENAU);

    await expect(page.getByText('Mariana Operadora Blumenau')).toBeVisible();
    await expect(page.getByText('Hering Blumenau Centro')).toBeVisible();

    // Operador deve visualizar a lista de modelos de checklist prontos para iniciar
    await expect(page.getByText(/Modelos de Checklist/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Iniciar Checklist/i }).first()).toBeVisible();
  });

  test('Deve realizar logout com sucesso e retornar para a tela de login', async ({ page }) => {
    await loginComo(page, USUARIOS.OPERADOR_BLUMENAU);

    // Clica no botão de Logout na barra de navegação
    const logoutBtn = page.getByRole('button', { name: /Sair|Logout/i }).or(page.locator('button[title*="Sair"]'));
    await logoutBtn.first().click();

    // Redireciona para /login
    await page.waitForURL('/login');
    await expect(page.getByText(/E-mail Corporativo/i)).toBeVisible();
  });
});
