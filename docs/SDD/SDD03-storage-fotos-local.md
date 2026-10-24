# SDD 03: Armazenamento Seguro de Fotos em Disco Local

- **Identificador:** SDD-03
- **Fase:** Mídia, I/O e Isolamento de Armazenamento
- **Commit Equivalente:** `4c15dea` (*feat(api): implementar LocalDiskStorage com protecao anti-path-traversal e testes*)
- **Status:** Implementado e Testado

---

## 1. Contexto e Requisitos

A operação de checklist exige evidências fotográficas obrigatórias para itens não conformes (`NC`) e conclusão de planos de ação corretivos. O desafio estabelece:
- **Proibição de Blobs / Base64 no Banco:** O banco de dados PostgreSQL deve armazenar estritamente metadados (tamanho, MIME type, chave relativa, vínculos).
- **Armazenamento Físico em Disco Local:** O storage deve operar com arquivos persistidos em disco, permitindo evolução futura para storage em nuvem (S3/GCS) sem quebrar o domínio.
- **Segurança e Proteção de I/O:** O acesso e gravação de arquivos não pode permitir vulnerabilidades de *Path Traversal* (`../`).

---

## 2. Decisões Arquiteturais e Implementação

### 2.1 Interface de Abstração `StorageService`
Criação do contrato abstrato [`StorageService`](file:///p:/09.%20Testes/hering/apps/api/src/services/storage/StorageService.ts):
```typescript
export interface StorageService {
  save(key: string, data: Buffer, mimeType: string): Promise<string>;
  getStream(key: string): Promise<NodeJS.ReadableStream>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  resolvePath(key: string): string;
}
```

### 2.2 Implementação `LocalDiskStorage`
A classe concreta [`LocalDiskStorage`](file:///p:/09.%20Testes/hering/apps/api/src/services/storage/LocalDiskStorage.ts) encapsula o acesso ao sistema de arquivos do host/container:
- **Resolução de Caminho Seguro:** Normaliza os caminhos com `path.resolve` e valida se o destino permanece estritamente contido no diretório raiz configurado (`baseDir`).
- **Mitigação Ativa de Path Traversal:** Caso uma chave contenha sequências maliciosas como `../../etc/passwd`, lança exceção imediata `ForbiddenError('Tentativa de acesso fora do diretório de armazenamento permitido')`.
- **Criação Automática de Subpastas:** Garante diretórios pais aninhados via `fs.promises.mkdir(..., { recursive: true })`.

### 2.3 Padrão de Chaves de Armazenamento
As chaves relativas seguem hierarquia determinística e particionada por loja e finalidade:
- **Fotos de Respostas de Checklist:**
  `lojas/{lojaId}/execucoes/{execucaoId}/respostas/{respostaId}/{fotoId}.jpg`
- **Fotos de Evidência de Plano de Ação:**
  `lojas/{lojaId}/planos/{planoId}/evidencias/{fotoId}.jpg`

---

## 3. Cobertura de Testes Unitários

Desenvolvidos testes automatizados com Vitest cobrindo:
1. Salvamento correto de arquivo binário em subdiretórios recursivos.
2. Leitura com streaming (`getStream`) preservando integridade de bytes.
3. Verificação de existência (`exists`) e remoção idempotente (`delete`).
4. **Teste de Segurança:** Bloqueio efetivo de tentativas de Path Traversal com chaves contendo `../`.
