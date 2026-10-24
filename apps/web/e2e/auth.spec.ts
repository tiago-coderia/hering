import { test, expect, USUARIOS, loginComo } from './helpers';

test.describe('E2E-01: Autenticação e Perfis (RBAC)', () => {
  test('Deve realizar login com Administrador e acessar visão gerencial global', async ({ page }) => {
    await loginComo(page, USUARIOS.ADMIN);

    // Valida que o nome do usuário está visível no título de boas-vindas
    await expect(page.getByRole('heading', { name: new RegExp(USUARIOS.ADMIN.nomeExibicao, 'i') })).toBeVisible();

    // Valida que o Administrador tem acesso ao botão de gerenciamento de modelos
    await expect(page.getByText(/Gerenciar Modelos & Versões/i)).toBeVisible();

    // Valida presença dos cards de ranking de lojas (visão global)
    await expect(page.getByText(/Ranking de Conformidade por Loja/i)).toBeVisible();
  });

  test('Deve realizar login com Gerente e ver apenas a sua loja (Blumenau)', async ({ page }) => {
    await loginComo(page, USUARIOS.GERENTE_BLUMENAU);

    await expect(page.getByRole('heading', { name: new RegExp(USUARIOS.GERENTE_BLUMENAU.nomeExibicao, 'i') })).toBeVisible();
    await expect(page.getByText('Hering Blumenau Centro').last()).toBeVisible();

    // Gerente NÃO deve ver o link "Gerenciar Modelos & Versões" de gestão administrativa
    await expect(page.getByText(/Gerenciar Modelos & Versões/i)).not.toBeVisible();

    // Gerente vê as abas de Modelos, Planos de Ação e Histórico
    await expect(page.getByRole('button', { name: /Planos de Ação/i })).toBeVisible();
  });

  test('Deve realizar login com Operador e exibir checklists disponíveis para execução', async ({ page }) => {
    await loginComo(page, USUARIOS.OPERADOR_BLUMENAU);

    await expect(page.getByRole('heading', { name: new RegExp(USUARIOS.OPERADOR_BLUMENAU.nomeExibicao, 'i') })).toBeVisible();
    await expect(page.getByText('Hering Blumenau Centro').last()).toBeVisible();

    // Operador deve visualizar a lista de modelos de checklist prontos para iniciar
    await expect(page.getByText(/Checklists Autorizados para Execução/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Iniciar Auditoria|Iniciar|Executar/i }).first()).toBeVisible();
  });

  test('Deve realizar logout com sucesso e retornar para a tela de login', async ({ page }) => {
    await loginComo(page, USUARIOS.OPERADOR_BLUMENAU);

    // Clica no botão de Logout na barra de navegação
    const logoutBtn = page.getByRole('button', { name: /Sair da conta|Sair|Logout/i });
    await logoutBtn.first().click();

    // Redireciona para /login
    await page.waitForURL('/login');
    await expect(page.getByText(/E-mail Corporativo/i)).toBeVisible();
  });
});

