import fs from 'fs';

export interface StorageService {
  /**
   * Salva um arquivo no armazenamento local.
   * @param buffer Conteúdo binário do arquivo.
   * @param relativePath Caminho relativo padronizado (ex: lojas/uuid/execucoes/uuid/...).
   */
  save(buffer: Buffer, relativePath: string): Promise<void>;

  /**
   * Recupera o arquivo como Buffer.
   * @param relativePath Caminho relativo do arquivo.
   */
  get(relativePath: string): Promise<Buffer>;

  /**
   * Retorna uma stream de leitura do arquivo.
   * @param relativePath Caminho relativo do arquivo.
   */
  getStream(relativePath: string): fs.ReadStream;

  /**
   * Verifica se o arquivo existe.
   * @param relativePath Caminho relativo do arquivo.
   */
  exists(relativePath: string): Promise<boolean>;

  /**
   * Remove o arquivo do disco.
   * @param relativePath Caminho relativo do arquivo.
   */
  delete(relativePath: string): Promise<void>;

  /**
   * Obtém o caminho absoluto no disco, com validação anti-path-traversal.
   * @param relativePath Caminho relativo do arquivo.
   */
  getAbsolutePath(relativePath: string): string;
}

