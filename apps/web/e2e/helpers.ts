import { test as base, expect, Page } from '@playwright/test';

export interface TestUser {
  nome: string;
  email: string;
  cargo: 'Administrador' | 'Gerente' | 'Operador';
  lojaNome?: string;
}

export const USUARIOS = {
  ADMIN: {
    nome: 'Administrador Global',
    email: 'admin@hering.com.br',
    cargo: 'Administrador' as const,
  },
  GERENTE_BLUMENAU: {
    nome: 'Carlos Gerente Blumenau',
    email: 'gerente.blumenau@hering.com.br',
    cargo: 'Gerente' as const,
    lojaNome: 'Hering Blumenau Centro',
  },
  OPERADOR_BLUMENAU: {
    nome: 'Mariana Operadora Blumenau',
    email: 'operador.blumenau@hering.com.br',
    cargo: 'Operador' as const,
    lojaNome: 'Hering Blumenau Centro',
  },
};

/**
 * Função utilitária para login direto pela interface rápida ou campos
 */
export async function loginComo(page: Page, user: TestUser) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Clica no botão de acesso rápido pelo nome do usuário
  const quickButton = page.getByRole('button', { name: new RegExp(user.nome, 'i') });
  if (await quickButton.isVisible()) {
    await quickButton.click();
  } else {
    // Fallback: preenchimento manual dos campos
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', 'hering123');
    await page.click('button[type="submit"]');
  }

  // Espera redirecionamento para o dashboard principal
  await page.waitForURL('/', { timeout: 10000 });
}

/**
 * Cria um buffer de imagem mock PNG válido para testes de upload
 */
export function getMockImageBuffer(): Buffer {
  // 1x1 transparent PNG base64
  const base64Png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return Buffer.from(base64Png, 'base64');
}

export const test = base;
export { expect };
