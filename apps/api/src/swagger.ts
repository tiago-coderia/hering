import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Checklist Operacional PWA',
      version: '1.0.0',
      description:
        'Documentação oficial OpenAPI dos endpoints REST para checklists, sincronização offline, planos de ação, fotos locais e painel gerencial.',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Servidor Local / Container',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Insira o token JWT retornado no endpoint de login',
        },
      },
      schemas: {
        Usuario: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nome: { type: 'string' },
            email: { type: 'string', format: 'email' },
            cargo: { type: 'string', enum: ['Administrador', 'Gerente', 'Operador'] },
            lojaId: { type: 'string', format: 'uuid', nullable: true },
            lojaNome: { type: 'string', nullable: true },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            usuario: { $ref: '#/components/schemas/Usuario' },
          },
        },
        ExecucaoSyncInput: {
          type: 'object',
          required: ['id', 'versaoModeloId', 'lojaId', 'iniciadaEm', 'status', 'respostas'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            versaoModeloId: { type: 'string', format: 'uuid' },
            lojaId: { type: 'string', format: 'uuid' },
            iniciadaEm: { type: 'string', format: 'date-time' },
            finalizadaEm: { type: 'string', format: 'date-time', nullable: true },
            status: { type: 'string', enum: ['RASCUNHO', 'FINALIZADA'] },
            respostas: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'itemDescricaoSnapshot', 'itemOrdemSnapshot', 'itemObrigatorioSnapshot', 'valor'],
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  itemModeloId: { type: 'string', format: 'uuid', nullable: true },
                  itemDescricaoSnapshot: { type: 'string' },
                  itemOrdemSnapshot: { type: 'integer' },
                  itemObrigatorioSnapshot: { type: 'boolean' },
                  itemPesoSnapshot: { type: 'number', default: 1.0 },
                  valor: { type: 'string', enum: ['C', 'NC', 'NA'] },
                  observacao: { type: 'string', nullable: true },
                  fotos: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        mimeType: { type: 'string' },
                        tamanhoBytes: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        PlanoAcaoUpdateInput: {
          type: 'object',
          required: ['revisaoEsperada'],
          properties: {
            status: { type: 'string', enum: ['ABERTO', 'EM_ANDAMENTO', 'CONCLUIDO'] },
            descricao: { type: 'string' },
            responsavelId: { type: 'string', format: 'uuid' },
            prazo: { type: 'string', format: 'date-time' },
            observacaoConclusao: { type: 'string' },
            revisaoEsperada: { type: 'integer', description: 'Revisão atual que o cliente possui para detectar 409 Conflict' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    paths: {
      '/auth/login': {
        post: {
          tags: ['Autenticação'],
          summary: 'Autentica usuário e retorna token JWT',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'senha'],
                  properties: {
                    email: { type: 'string', example: 'gerente.blumenau@hering.com.br' },
                    senha: { type: 'string', example: 'GerentePassword123!' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Autenticado com sucesso',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } },
            },
            401: { description: 'Credenciais inválidas' },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Autenticação'],
          summary: 'Retorna perfil do usuário logado',
          responses: {
            200: {
              description: 'Dados do perfil',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Usuario' } } },
            },
          },
        },
      },
      '/modelos': {
        get: {
          tags: ['Checklists'],
          summary: 'Lista modelos e versões disponíveis para o cargo do usuário',
          responses: { 200: { description: 'Lista de modelos' } },
        },
      },
      '/execucoes/sync': {
        post: {
          tags: ['Sincronização'],
          summary: 'Sincroniza execuções e gera planos automáticos de forma idempotente',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['execucoes'],
                  properties: {
                    execucoes: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ExecucaoSyncInput' },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Sincronizado com sucesso' },
            400: { description: 'Item obrigatório sem resposta ou falta foto para NC' },
            403: { description: 'Não autorizado para a loja informada' },
          },
        },
      },
      '/planos-acao': {
        get: {
          tags: ['Planos de Ação'],
          summary: 'Lista planos de ação da loja do usuário',
          responses: { 200: { description: 'Lista de planos' } },
        },
      },
      '/planos-acao/{id}': {
        patch: {
          tags: ['Planos de Ação'],
          summary: 'Atualiza plano de ação com checagem de revisão (409 Conflict)',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PlanoAcaoUpdateInput' } } },
          },
          responses: {
            200: { description: 'Atualizado com sucesso' },
            400: { description: 'Falta foto de evidência para concluir' },
            409: { description: 'Conflito de versão (revisão no servidor difere da esperada)' },
          },
        },
      },
      '/fotos/upload': {
        post: {
          tags: ['Mídias / Fotos'],
          summary: 'Upload de foto associada a resposta ou evidência de plano',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['foto', 'fotoId'],
                  properties: {
                    foto: { type: 'string', format: 'binary' },
                    fotoId: { type: 'string', format: 'uuid' },
                    respostaId: { type: 'string', format: 'uuid' },
                    planoAcaoId: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Foto salva com sucesso no disco local' },
            403: { description: 'Não autorizado para a loja vinculada' },
          },
        },
      },
      '/fotos/{id}': {
        get: {
          tags: ['Mídias / Fotos'],
          summary: 'Download autenticado de foto com validação por loja',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'Arquivo binário de imagem retornado' },
            403: { description: 'Acesso negado: foto pertence a outra loja' },
            404: { description: 'Foto não encontrada' },
          },
        },
      },
      '/dashboard': {
        get: {
          tags: ['Painel Gerencial'],
          summary: 'Ranking de lojas e indicadores de planos atrasados (RD02)',
          responses: { 200: { description: 'Métricas e ranking gerencial' } },
        },
      },
      '/health': {
        get: {
          tags: ['Saúde do Sistema'],
          summary: 'Verificação de integridade da API e banco de dados',
          security: [],
          responses: { 200: { description: 'API e banco operacionais' } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);

