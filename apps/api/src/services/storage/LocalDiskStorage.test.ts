import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { LocalDiskStorage } from './LocalDiskStorage';

describe('LocalDiskStorage (StorageService e Segurança de Mídia)', () => {
  const testStorageDir = path.resolve(__dirname, '../../../test-uploads-temp');
  let storage: LocalDiskStorage;

  beforeEach(() => {
    storage = new LocalDiskStorage(testStorageDir);
  });

  afterEach(async () => {
    if (fs.existsSync(testStorageDir)) {
      await fs.promises.rm(testStorageDir, { recursive: true, force: true });
    }
  });

  it('deve salvar e recuperar um arquivo em buffer com sucesso', async () => {
    const relativePath = 'lojas/loja-1/execucoes/exec-1/respostas/resp-1/foto-1.jpg';
    const content = Buffer.from('fake-jpeg-image-binary-content');

    await storage.save(content, relativePath);
    const exists = await storage.exists(relativePath);
    expect(exists).toBe(true);

    const retrieved = await storage.get(relativePath);
    expect(retrieved.toString()).toBe(content.toString());
  });

  it('deve ser idempotente ao salvar o mesmo arquivo repetidamente', async () => {
    const relativePath = 'lojas/loja-1/execucoes/exec-1/respostas/resp-1/foto-rep.jpg';
    const content = Buffer.from('repeated-content');

    await storage.save(content, relativePath);
    // Segunda chamada idêntica não deve disparar erro
    await expect(storage.save(content, relativePath)).resolves.not.toThrow();

    const retrieved = await storage.get(relativePath);
    expect(retrieved.toString()).toBe('repeated-content');
  });

  it('deve bloquear e lançar erro contra tentativas de Path Traversal', () => {
    const maliciousPaths = [
      '../../etc/passwd',
      '..\\..\\windows\\system32\\cmd.exe',
      'lojas/../../secret.txt',
    ];

    for (const p of maliciousPaths) {
      expect(() => storage.getAbsolutePath(p)).toThrow(/Acesso negado: tentativa de Path Traversal/);
    }
  });
});

