import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../prisma';

describe('Testes de Integração de Ponta a Ponta (API, Segurança e Sincronização)', () => {
  let tokenAdmin: string;
  let tokenGerenteBlumenau: string;
  let tokenOperadorBlumenau: string;
  let tokenGerentePaulista: string;

  let lojaBlumenauId: string;
  let lojaPaulistaId: string;
  let modeloAberturaId: string;
  let versaoAberturaId: string;
  let itensAbertura: Array<{ id: string; descricao: string; obrigatorio: boolean; peso: number }>;

  beforeAll(async () => {
    // 1. Obter tokens de autenticação via endpoint /api/v1/auth/login
    const resAdmin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hering.com.br', senha: 'AdminPassword123!' });
    tokenAdmin = resAdmin.body.token;

    const resGerenteBlumenau = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'gerente.blumenau@hering.com.br', senha: 'GerentePassword123!' });
    tokenGerenteBlumenau = resGerenteBlumenau.body.token;

    const resOperadorBlumenau = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'operador.blumenau@hering.com.br', senha: 'OperadorPassword123!' });
    tokenOperadorBlumenau = resOperadorBlumenau.body.token;

    const resGerentePaulista = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'gerente.paulista@hering.com.br', senha: 'GerentePassword123!' });
    tokenGerentePaulista = resGerentePaulista.body.token;

    // 2. Obter referências de lojas e modelos do seed
    const lojaBlumenau = await prisma.loja.findUnique({ where: { codigo: 'LJ-001' } });
    const lojaPaulista = await prisma.loja.findUnique({ where: { codigo: 'LJ-002' } });
    lojaBlumenauId = lojaBlumenau!.id;
    lojaPaulistaId = lojaPaulista!.id;

    const modelo = await prisma.modeloChecklist.findFirst({
      where: { nome: 'Checklist de Abertura de Loja' },
      include: {
        versoes: {
          include: { itens: { orderBy: { ordem: 'asc' } } },
        },
      },
    });

    modeloAberturaId = modelo!.id;
    versaoAberturaId = modelo!.versoes[0].id;
    itensAbertura = modelo!.versoes[0].itens;
  });

  describe('1. Autenticação e Autorização por Cargo (RF01)', () => {
    it('deve realizar login com sucesso e retornar token JWT com claims corretas', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'gerente.blumenau@hering.com.br', senha: 'GerentePassword123!' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.usuario.cargo).toBe('Gerente');
      expect(res.body.usuario.lojaId).toBe(lojaBlumenauId);
    });

    it('deve recusar autenticação com senha incorreta (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'gerente.blumenau@hering.com.br', senha: 'SenhaTotalmenteErrada' });

      expect(res.status).toBe(401);
    });

    it('deve permitir acesso ao perfil autenticado em /api/v1/auth/me', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokenGerenteBlumenau}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('gerente.blumenau@hering.com.br');
    });
  });

  describe('2. Isolamento de Dados por Loja (RF01 e RF10)', () => {
    it('deve impedir que Operador de Blumenau envie execução para Loja Paulista (403 Forbidden)', async () => {
      const execId = `test-exec-cross-store-${Date.now()}`;
      const payload = {
        execucoes: [
          {
            id: execId,
            versaoModeloId: versaoAberturaId,
            lojaId: lojaPaulistaId, // Tentativa de enviar para loja diferente da sua
            iniciadaEm: new Date().toISOString(),
            status: 'RASCUNHO',
            respostas: [],
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/execucoes/sync')
        .set('Authorization', `Bearer ${tokenOperadorBlumenau}`)
        .send(payload);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Não autorizado a sincronizar/);
    });
  });

  describe('3. Validação de Itens Obrigatórios e Fotos em NC (RF04 e RF05)', () => {
    it('deve bloquear finalização se houver item obrigatório sem resposta (400 Bad Request)', async () => {
      const execId = `test-exec-mandatory-${Date.now()}`;
      const itemObrigatorio1 = itensAbertura[0];

      // Envia apenas o item 1 respondido, deixando os demais obrigatórios sem resposta
      const payload = {
        execucoes: [
          {
            id: execId,
            versaoModeloId: versaoAberturaId,
            lojaId: lojaBlumenauId,
            iniciadaEm: new Date().toISOString(),
            finalizadaEm: new Date().toISOString(),
            status: 'FINALIZADA',
            respostas: [
              {
                id: `resp-${Date.now()}-1`,
                itemModeloId: itemObrigatorio1.id,
                itemDescricaoSnapshot: itemObrigatorio1.descricao,
                itemOrdemSnapshot: 1,
                itemObrigatorioSnapshot: true,
                itemPesoSnapshot: 1.0,
                valor: 'C',
              },
            ],
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/execucoes/sync')
        .set('Authorization', `Bearer ${tokenOperadorBlumenau}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Não é possível finalizar a execução: existem .* item\(ns\) obrigatório\(s\) sem resposta/);
    });

    it('deve exigir foto se item for marcado como Não Conforme (NC) (400 Bad Request)', async () => {
      const execId = `test-exec-nc-nofoto-${Date.now()}`;
      const item1 = itensAbertura[0];

      const payload = {
        execucoes: [
          {
            id: execId,
            versaoModeloId: versaoAberturaId,
            lojaId: lojaBlumenauId,
            iniciadaEm: new Date().toISOString(),
            status: 'RASCUNHO',
            respostas: [
              {
                id: `resp-nc-${Date.now()}`,
                itemModeloId: item1.id,
                itemDescricaoSnapshot: item1.descricao,
                itemOrdemSnapshot: 1,
                itemObrigatorioSnapshot: true,
                itemPesoSnapshot: 1.0,
                valor: 'NC',
                fotos: [], // Vazio! Deve falhar pois NC exige foto
              },
            ],
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/execucoes/sync')
        .set('Authorization', `Bearer ${tokenOperadorBlumenau}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/exige foto obrigatória/);
    });
  });

  describe('4. Sincronização Idempotente e Geração Automática de Plano de Ação (RF06 e RF09)', () => {
    const execId = `exec-idempotente-${Date.now()}`;
    const fotoId = `foto-nc-${Date.now()}`;
    let planoCriadoId: string;

    const buildFullExecutionPayload = () => ({
      execucoes: [
        {
          id: execId,
          versaoModeloId: versaoAberturaId,
          lojaId: lojaBlumenauId,
          iniciadaEm: new Date().toISOString(),
          finalizadaEm: new Date().toISOString(),
          status: 'FINALIZADA',
          respostas: itensAbertura.map((it, idx) => ({
            id: `resp-${execId}-${idx}`,
            itemModeloId: it.id,
            itemDescricaoSnapshot: it.descricao,
            itemOrdemSnapshot: idx + 1,
            itemObrigatorioSnapshot: it.obrigatorio,
            itemPesoSnapshot: it.peso,
            valor: idx === 1 ? 'NC' : 'C', // Segundo item é Não Conforme
            observacao: idx === 1 ? 'Bobina reserva do PDV 2 danificada' : 'OK',
            fotos: idx === 1 ? [{ id: fotoId, mimeType: 'image/jpeg', tamanhoBytes: 15420 }] : [],
          })),
        },
      ],
    });

    it('deve sincronizar execução completa, calcular score e criar plano de ação automático para NC', async () => {
      const payload = buildFullExecutionPayload();

      const res = await request(app)
        .post('/api/v1/execucoes/sync')
        .set('Authorization', `Bearer ${tokenOperadorBlumenau}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.execucoes[0].id).toBe(execId);
      expect(res.body.execucoes[0].status).toBe('FINALIZADA');
      expect(typeof res.body.execucoes[0].pontuacao).toBe('number');

      // Verifica no banco a criação do plano de ação automático
      const plano = await prisma.planoAcao.findFirst({
        where: { lojaId: lojaBlumenauId, resposta: { execucaoId: execId } },
      });

      expect(plano).toBeDefined();
      expect(plano!.status).toBe('ABERTO');
      expect(plano!.revisao).toBe(1);
      planoCriadoId = plano!.id;
    });

    it('deve ser 100% IDEMPOTENTE ao reenviar a mesma execução sem duplicar registros (RF09)', async () => {
      const totalExecucoesAntes = await prisma.execucao.count({ where: { id: execId } });
      const totalPlanosAntes = await prisma.planoAcao.count({ where: { id: planoCriadoId } });

      // Reenvio idêntico da mesma execução
      const resRepetido = await request(app)
        .post('/api/v1/execucoes/sync')
        .set('Authorization', `Bearer ${tokenOperadorBlumenau}`)
        .send(buildFullExecutionPayload());

      expect(resRepetido.status).toBe(200);

      const totalExecucoesDepois = await prisma.execucao.count({ where: { id: execId } });
      const totalPlanosDepois = await prisma.planoAcao.count({ where: { id: planoCriadoId } });

      expect(totalExecucoesDepois).toBe(totalExecucoesAntes);
      expect(totalPlanosDepois).toBe(totalPlanosAntes);
    });

    it('deve detectar conflito de concorrência com 409 Conflict se revisaoEsperada divergir', async () => {
      // Cliente envia atualização com revisaoEsperada = 99 (servidor está na revisão 1)
      const res = await request(app)
        .patch(`/api/v1/planos-acao/${planoCriadoId}`)
        .set('Authorization', `Bearer ${tokenGerenteBlumenau}`)
        .send({
          revisaoEsperada: 99,
          status: 'EM_ANDAMENTO',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/Conflito de versão detectado/);
      expect(res.body.details.revisaoServidor).toBe(1);
    });

    it('deve impedir conclusão de plano de ação sem evidência fotográfica da correção (RF06)', async () => {
      // Tentativa de marcar como CONCLUIDO sem nenhuma foto vinculada ao plano
      const res = await request(app)
        .patch(`/api/v1/planos-acao/${planoCriadoId}`)
        .set('Authorization', `Bearer ${tokenGerenteBlumenau}`)
        .send({
          revisaoEsperada: 1,
          status: 'CONCLUIDO',
          observacaoConclusao: 'Bobina substituída',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/É obrigatório anexar pelo menos uma foto de evidência/);
    });

    it('deve impedir que Gerente de Paulista altere plano de ação de Blumenau (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/v1/planos-acao/${planoCriadoId}`)
        .set('Authorization', `Bearer ${tokenGerentePaulista}`)
        .send({
          revisaoEsperada: 1,
          status: 'EM_ANDAMENTO',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('5. Upload, Download e Isolamento de Fotos no Disco Local (RF05)', () => {
    let fotoEnvioId = `foto-test-upload-${Date.now()}`;
    let respostaIdVinculada: string;

    beforeAll(async () => {
      // Busca uma resposta existente de Blumenau para vincular a foto
      const resp = await prisma.resposta.findFirst({
        where: { execucao: { lojaId: lojaBlumenauId } },
      });
      respostaIdVinculada = resp!.id;
    });

    it('deve realizar upload autenticado de foto binária para o disco local', async () => {
      const bufferFicticio = Buffer.from('fake-jpeg-binary-photo-test');

      const res = await request(app)
        .post('/api/v1/fotos/upload')
        .set('Authorization', `Bearer ${tokenOperadorBlumenau}`)
        .field('fotoId', fotoEnvioId)
        .field('respostaId', respostaIdVinculada)
        .attach('foto', bufferFicticio, { filename: 'foto.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(fotoEnvioId);
      expect(res.body.chaveRelativa).toContain('lojas/');
    });

    it('deve permitir download autenticado por usuário da mesma loja', async () => {
      const res = await request(app)
        .get(`/api/v1/fotos/${fotoEnvioId}`)
        .set('Authorization', `Bearer ${tokenGerenteBlumenau}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('image/jpeg');
    });

    it('deve bloquear download de foto por usuário de outra loja (403 Forbidden)', async () => {
      // Gerente da Loja Paulista tentando baixar foto da Loja Blumenau
      const res = await request(app)
        .get(`/api/v1/fotos/${fotoEnvioId}`)
        .set('Authorization', `Bearer ${tokenGerentePaulista}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Acesso negado: você não tem permissão para visualizar fotos de outra loja/);
    });
  });

  describe('6. Painel Gerencial e Ranking (RD02)', () => {
    it('deve retornar métricas e ranking de conformidade por loja', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.totais).toBeDefined();
      expect(Array.isArray(res.body.rankingLojas)).toBe(true);
      expect(res.body.rankingLojas.length).toBeGreaterThanOrEqual(2);
    });
  });
});

