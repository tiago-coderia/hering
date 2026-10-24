import { test as base, expect, Page } from '@playwright/test';

export interface TestUser {
  nome: string;
  email: string;
  cargo: 'Administrador' | 'Gerente' | 'Operador';
  lojaNome?: string;
}

export const USUARIOS = {
  ADMIN: {
    nome: 'Administrador',
    nomeExibicao: 'Administrador Geral',
    email: 'admin@hering.com.br',
    senha: 'AdminPassword123!',
    cargo: 'Administrador' as const,
  },
  GERENTE_BLUMENAU: {
    nome: 'Gerente Blumenau',
    nomeExibicao: 'Carlos Gerente Blumenau',
    email: 'gerente.blumenau@hering.com.br',
    senha: 'GerentePassword123!',
    cargo: 'Gerente' as const,
    lojaNome: 'Hering Blumenau Centro',
  },
  OPERADOR_BLUMENAU: {
    nome: 'Operador Blumenau',
    nomeExibicao: 'Ana Operadora Blumenau',
    email: 'operador.blumenau@hering.com.br',
    senha: 'OperadorPassword123!',
    cargo: 'Operador' as const,
    lojaNome: 'Hering Blumenau Centro',
  },
};

/**
 * Função utilitária para login direto pela interface rápida ou campos
 */
export async function loginComo(page: Page, user: (typeof USUARIOS)[keyof typeof USUARIOS]) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Clica no botão de demonstração (seed) correspondente
  const demoButton = page.locator('button').filter({ hasText: user.nome });
  if (await demoButton.first().isVisible()) {
    await demoButton.first().click();
  } else {
    // Fallback: preenchimento manual dos campos
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.senha);
  }

  // Clica no botão oficial de submissão do formulário
  await page.click('button[type="submit"]');

  // Espera redirecionamento para o dashboard principal
  await page.waitForURL('/', { timeout: 15000 });
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

