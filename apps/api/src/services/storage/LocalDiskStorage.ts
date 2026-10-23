import fs from 'fs';
import path from 'path';
import { StorageService } from './StorageService';

export class LocalDiskStorage implements StorageService {
  private baseDir: string;

  constructor(baseDir?: string) {
    // Se não fornecido, usa a variável de ambiente UPLOAD_DIR ou default no diretório raiz data/uploads
    const configuredDir = baseDir || process.env.UPLOAD_DIR || path.resolve(process.cwd(), '../../data/uploads');
    this.baseDir = path.resolve(configuredDir);

    // Garante que o diretório base exista
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Valida e resolve o caminho absoluto evitando Path Traversal.
   */
  public getAbsolutePath(relativePath: string): string {
    const absolutePath = path.resolve(this.baseDir, relativePath);

    // Validação estrita de sandbox: o caminho deve permanecer estritamente contido no diretório base
    if (absolutePath !== this.baseDir && !absolutePath.startsWith(this.baseDir + path.sep)) {
      throw new Error(`Acesso negado: tentativa de Path Traversal detectada para "${relativePath}"`);
    }

    return absolutePath;
  }

  public async save(buffer: Buffer, relativePath: string): Promise<void> {
    const fullPath = this.getAbsolutePath(relativePath);
    const parentDir = path.dirname(fullPath);

    if (!fs.existsSync(parentDir)) {
      await fs.promises.mkdir(parentDir, { recursive: true });
    }

    // Se o arquivo já existe e possui exatamente o mesmo tamanho, é uma operação idempotente
    if (fs.existsSync(fullPath)) {
      const stat = await fs.promises.stat(fullPath);
      if (stat.size === buffer.length) {
        return;
      }
    }

    await fs.promises.writeFile(fullPath, buffer);
  }

  public async get(relativePath: string): Promise<Buffer> {
    const fullPath = this.getAbsolutePath(relativePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Arquivo não encontrado: ${relativePath}`);
    }
    return fs.promises.readFile(fullPath);
  }

  public getStream(relativePath: string): fs.ReadStream {
    const fullPath = this.getAbsolutePath(relativePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Arquivo não encontrado: ${relativePath}`);
    }
    return fs.createReadStream(fullPath);
  }

  public async exists(relativePath: string): Promise<boolean> {
    const fullPath = this.getAbsolutePath(relativePath);
    return fs.existsSync(fullPath);
  }

  public async delete(relativePath: string): Promise<void> {
    const fullPath = this.getAbsolutePath(relativePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }
}
