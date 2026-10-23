import { Router } from 'express';
import { z } from 'zod';
import { ChecklistService } from '../services/checklist/ChecklistService';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware';

export const checklistRouter = Router();

checklistRouter.use(authenticateToken);

const itemInputSchema = z.object({
  ordem: z.number().int().min(1),
  descricao: z.string().min(2, 'Descrição do item obrigatória'),
  obrigatorio: z.boolean().default(true),
  exigeFotoEmNC: z.boolean().default(true),
  peso: z.number().positive().default(1.0),
});

const createModeloSchema = z.object({
  nome: z.string().min(3, 'Nome do modelo deve ter ao menos 3 caracteres'),
  descricao: z.string().optional(),
  cargoPermitidoId: z.string(),
  publicar: z.boolean().default(true),
  itens: z.array(itemInputSchema).min(1, 'O modelo deve conter pelo menos 1 item'),
});

const updateModeloSchema = z.object({
  nome: z.string().min(3).optional(),
  descricao: z.string().optional(),
  ativo: z.boolean().optional(),
  cargoPermitidoId: z.string().optional(),
  itens: z.array(itemInputSchema).optional(),
});

const syncExecucoesSchema = z.object({
  execucoes: z.array(
    z.object({
      id: z.string(),
      versaoModeloId: z.string(),
      lojaId: z.string(),
      iniciadaEm: z.string(),
      finalizadaEm: z.string().nullable().optional(),
      status: z.enum(['RASCUNHO', 'FINALIZADA']),
      respostas: z.array(
        z.object({
          id: z.string(),
          itemModeloId: z.string().optional(),
          itemDescricaoSnapshot: z.string(),
          itemOrdemSnapshot: z.number().int(),
          itemObrigatorioSnapshot: z.boolean(),
          itemPesoSnapshot: z.number().default(1.0),
          valor: z.enum(['C', 'NC', 'NA']),
          observacao: z.string().nullable().optional(),
          fotos: z
            .array(
              z.object({
                id: z.string(),
                mimeType: z.string(),
                tamanhoBytes: z.number().int(),
              })
            )
            .optional(),
          planoAcao: z
            .object({
              id: z.string(),
              descricao: z.string().optional(),
              responsavelId: z.string().optional(),
              prazo: z.string().optional(),
            })
            .optional(),
        })
      ),
    })
  ),
});

// Modelos
checklistRouter.get('/modelos', async (req, res, next) => {
  try {
    const modelos = await ChecklistService.listModelos(req.user!);
    res.json(modelos);
  } catch (error) {
    next(error);
  }
});

checklistRouter.get('/modelos/:id', async (req, res, next) => {
  try {
    const modelo = await ChecklistService.getModeloById(req.params.id, req.user!);
    res.json(modelo);
  } catch (error) {
    next(error);
  }
});

checklistRouter.post('/modelos', requireRole('Administrador'), async (req, res, next) => {
  try {
    const dados = createModeloSchema.parse(req.body);
    const novoModelo = await ChecklistService.createModelo(dados, req.user!);
    res.status(201).json(novoModelo);
  } catch (error) {
    next(error);
  }
});

checklistRouter.put('/modelos/:id', requireRole('Administrador'), async (req, res, next) => {
  try {
    const dados = updateModeloSchema.parse(req.body);
    const atualizado = await ChecklistService.updateModeloComVersionamento(
      req.params.id,
      dados,
      req.user!
    );
    res.json(atualizado);
  } catch (error) {
    next(error);
  }
});

checklistRouter.patch('/modelos/:id/ativo', requireRole('Administrador'), async (req, res, next) => {
  try {
    const { ativo } = z.object({ ativo: z.boolean() }).parse(req.body);
    const atualizado = await ChecklistService.toggleAtivo(req.params.id, ativo, req.user!);
    res.json(atualizado);
  } catch (error) {
    next(error);
  }
});

// Sincronização Idempotente de Execuções
checklistRouter.post('/execucoes/sync', async (req, res, next) => {
  try {
    const { execucoes } = syncExecucoesSchema.parse(req.body);
    const resultado = await ChecklistService.syncExecucoes(execucoes, req.user!);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

// Histórico de Execuções
checklistRouter.get('/execucoes', async (req, res, next) => {
  try {
    const filtroLojaId = req.query.lojaId as string | undefined;
    const historico = await ChecklistService.listExecucoes(req.user!, filtroLojaId);
    res.json(historico);
  } catch (error) {
    next(error);
  }
});

checklistRouter.get('/execucoes/:id', async (req, res, next) => {
  try {
    const execucao = await ChecklistService.getExecucaoById(req.params.id, req.user!);
    res.json(execucao);
  } catch (error) {
    next(error);
  }
});

