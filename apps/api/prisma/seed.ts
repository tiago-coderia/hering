import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seed() {
  console.log('--- Iniciando Seed do Banco de Dados ---');

  // 1. Cargos
  const cargoAdmin = await prisma.cargo.upsert({
    where: { nome: 'Administrador' },
    update: {},
    create: {
      nome: 'Administrador',
      descricao: 'Acesso irrestrito a cadastros, modelos e relatórios globais',
    },
  });

  const cargoGerente = await prisma.cargo.upsert({
    where: { nome: 'Gerente' },
    update: {},
    create: {
      nome: 'Gerente',
      descricao: 'Gestão da loja, execução de auditorias e conclusão de planos de ação',
    },
  });

  const cargoOperador = await prisma.cargo.upsert({
    where: { nome: 'Operador' },
    update: {},
    create: {
      nome: 'Operador',
      descricao: 'Execução de rotinas e checklists diários da loja',
    },
  });

  console.log('✓ Cargos criados/verificados.');

  // 2. Lojas
  const loja1 = await prisma.loja.upsert({
    where: { codigo: 'LJ-001' },
    update: {},
    create: {
      codigo: 'LJ-001',
      nome: 'Hering Blumenau Centro',
      cidade: 'Blumenau',
      uf: 'SC',
      ativo: true,
    },
  });

  const loja2 = await prisma.loja.upsert({
    where: { codigo: 'LJ-002' },
    update: {},
    create: {
      codigo: 'LJ-002',
      nome: 'Hering São Paulo Paulista',
      cidade: 'São Paulo',
      uf: 'SP',
      ativo: true,
    },
  });

  console.log('✓ Lojas criadas/verificadas.');

  // 3. Usuários
  const hashAdmin = await bcrypt.hash('AdminPassword123!', 10);
  const hashGerente = await bcrypt.hash('GerentePassword123!', 10);
  const hashOperador = await bcrypt.hash('OperadorPassword123!', 10);

  // Admin (Sem loja fixa - acesso global)
  await prisma.usuario.upsert({
    where: { email: 'admin@hering.com.br' },
    update: { senhaHash: hashAdmin, cargoId: cargoAdmin.id },
    create: {
      nome: 'Administrador Geral',
      email: 'admin@hering.com.br',
      senhaHash: hashAdmin,
      cargoId: cargoAdmin.id,
      lojaId: null,
      ativo: true,
    },
  });

  // Loja 1 - Blumenau
  await prisma.usuario.upsert({
    where: { email: 'gerente.blumenau@hering.com.br' },
    update: { senhaHash: hashGerente, cargoId: cargoGerente.id, lojaId: loja1.id },
    create: {
      nome: 'Carlos Gerente Blumenau',
      email: 'gerente.blumenau@hering.com.br',
      senhaHash: hashGerente,
      cargoId: cargoGerente.id,
      lojaId: loja1.id,
      ativo: true,
    },
  });

  await prisma.usuario.upsert({
    where: { email: 'operador.blumenau@hering.com.br' },
    update: { senhaHash: hashOperador, cargoId: cargoOperador.id, lojaId: loja1.id },
    create: {
      nome: 'Ana Operadora Blumenau',
      email: 'operador.blumenau@hering.com.br',
      senhaHash: hashOperador,
      cargoId: cargoOperador.id,
      lojaId: loja1.id,
      ativo: true,
    },
  });

  // Loja 2 - Paulista
  await prisma.usuario.upsert({
    where: { email: 'gerente.paulista@hering.com.br' },
    update: { senhaHash: hashGerente, cargoId: cargoGerente.id, lojaId: loja2.id },
    create: {
      nome: 'Mariana Gerente Paulista',
      email: 'gerente.paulista@hering.com.br',
      senhaHash: hashGerente,
      cargoId: cargoGerente.id,
      lojaId: loja2.id,
      ativo: true,
    },
  });

  await prisma.usuario.upsert({
    where: { email: 'operador.paulista@hering.com.br' },
    update: { senhaHash: hashOperador, cargoId: cargoOperador.id, lojaId: loja2.id },
    create: {
      nome: 'Pedro Operador Paulista',
      email: 'operador.paulista@hering.com.br',
      senhaHash: hashOperador,
      cargoId: cargoOperador.id,
      lojaId: loja2.id,
      ativo: true,
    },
  });

  console.log('✓ Usuários de demonstração criados/verificados.');

  // 4. Modelos e Versões de Checklist
  // Modelo 1: Abertura de Loja (Autorizado para Operador)
  let modAbertura = await prisma.modeloChecklist.findFirst({
    where: { nome: 'Checklist de Abertura de Loja' },
  });

  if (!modAbertura) {
    modAbertura = await prisma.modeloChecklist.create({
      data: {
        nome: 'Checklist de Abertura de Loja',
        descricao: 'Verificação diária de prontidão antes da abertura das portas ao público',
        ativo: true,
      },
    });
  }

  let verAbertura = await prisma.versaoModeloChecklist.findFirst({
    where: { modeloId: modAbertura.id, versao: 1 },
  });

  if (!verAbertura) {
    verAbertura = await prisma.versaoModeloChecklist.create({
      data: {
        modeloId: modAbertura.id,
        versao: 1,
        cargoPermitidoId: cargoOperador.id,
        publicado: true,
        publicadoEm: new Date(),
        itens: {
          create: [
            {
              ordem: 1,
              descricao: 'Fachada, vitrine e luminosos limpos e ligados',
              obrigatorio: true,
              exigeFotoEmNC: true,
              peso: 1.0,
            },
            {
              ordem: 2,
              descricao: 'Caixas e PDVs operacionais com bobinas reservas',
              obrigatorio: true,
              exigeFotoEmNC: true,
              peso: 2.0,
            },
            {
              ordem: 3,
              descricao: 'Iluminação geral do salão de vendas em pleno funcionamento',
              obrigatorio: true,
              exigeFotoEmNC: true,
              peso: 1.0,
            },
            {
              ordem: 4,
              descricao: 'Ar-condicionado e sonorização ambiental configurados',
              obrigatorio: false,
              exigeFotoEmNC: true,
              peso: 1.0,
            },
            {
              ordem: 5,
              descricao: 'Estoque e provadores organizados e livres de obstrução',
              obrigatorio: true,
              exigeFotoEmNC: true,
              peso: 2.0,
            },
          ],
        },
      },
    });
  }

  // Modelo 2: Fechamento e Auditoria (Autorizado para Gerente)
  let modFechamento = await prisma.modeloChecklist.findFirst({
    where: { nome: 'Auditoria de Fechamento e Segurança' },
  });

  if (!modFechamento) {
    modFechamento = await prisma.modeloChecklist.create({
      data: {
        nome: 'Auditoria de Fechamento e Segurança',
        descricao: 'Rotina de encerramento do expediente, conferência de sangria e segurança predial',
        ativo: true,
      },
    });
  }

  let verFechamento = await prisma.versaoModeloChecklist.findFirst({
    where: { modeloId: modFechamento.id, versao: 1 },
  });

  if (!verFechamento) {
    verFechamento = await prisma.versaoModeloChecklist.create({
      data: {
        modeloId: modFechamento.id,
        versao: 1,
        cargoPermitidoId: cargoGerente.id,
        publicado: true,
        publicadoEm: new Date(),
        itens: {
          create: [
            {
              ordem: 1,
              descricao: 'Cofre trancado e malotes de sangria conferidos com o sistema',
              obrigatorio: true,
              exigeFotoEmNC: true,
              peso: 3.0,
            },
            {
              ordem: 2,
              descricao: 'Alarme perimetral armado e sensores sem obstrução',
              obrigatorio: true,
              exigeFotoEmNC: true,
              peso: 3.0,
            },
            {
              ordem: 3,
              descricao: 'Portas de acesso e cortinas metálicas travadas e cadeados checados',
              obrigatorio: true,
              exigeFotoEmNC: true,
              peso: 2.0,
            },
            {
              ordem: 4,
              descricao: 'Equipamentos elétricos secundários e luzes internas desligados',
              obrigatorio: false,
              exigeFotoEmNC: true,
              peso: 1.0,
            },
          ],
        },
      },
    });
  }

  console.log('✓ Modelos de checklist e versões publicadas criados.');
  console.log('--- Seed Finalizado com Sucesso! ---');
}

// Executar seed quando chamado diretamente via script
if (require.main === module) {
  seed()
    .catch((e) => {
      console.error('Erro ao executar seed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

