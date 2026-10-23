-- CreateTable
CREATE TABLE "lojas" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lojas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cargos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "cargo_id" TEXT NOT NULL,
    "loja_id" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelos_checklist" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modelos_checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versoes_modelo_checklist" (
    "id" TEXT NOT NULL,
    "modelo_id" TEXT NOT NULL,
    "versao" INTEGER NOT NULL,
    "cargo_permitido_id" TEXT NOT NULL,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "publicado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "versoes_modelo_checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_modelo_checklist" (
    "id" TEXT NOT NULL,
    "versao_modelo_id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT true,
    "exige_foto_em_nc" BOOLEAN NOT NULL DEFAULT true,
    "peso" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_modelo_checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execucoes" (
    "id" TEXT NOT NULL,
    "versao_modelo_id" TEXT NOT NULL,
    "modelo_versao_snapshot" INTEGER NOT NULL,
    "modelo_nome_snapshot" TEXT NOT NULL,
    "loja_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "pontuacao" DOUBLE PRECISION,
    "iniciada_em" TIMESTAMP(3) NOT NULL,
    "finalizada_em" TIMESTAMP(3),
    "sincronizada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "execucoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respostas" (
    "id" TEXT NOT NULL,
    "execucao_id" TEXT NOT NULL,
    "item_modelo_id" TEXT,
    "item_descricao_snapshot" TEXT NOT NULL,
    "item_ordem_snapshot" INTEGER NOT NULL,
    "item_obrigatorio_snapshot" BOOLEAN NOT NULL,
    "item_peso_snapshot" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "valor" TEXT NOT NULL,
    "observacao" TEXT,
    "respondido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respostas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos_acao" (
    "id" TEXT NOT NULL,
    "resposta_id" TEXT NOT NULL,
    "loja_id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "responsavel_id" TEXT NOT NULL,
    "prazo" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "revisao" INTEGER NOT NULL DEFAULT 1,
    "observacao_conclusao" TEXT,
    "concluido_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_acao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fotos" (
    "id" TEXT NOT NULL,
    "resposta_id" TEXT,
    "plano_acao_id" TEXT,
    "chave_relativa" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "tamanho_bytes" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lojas_codigo_key" ON "lojas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "cargos_nome_key" ON "cargos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "versoes_modelo_checklist_modelo_id_versao_key" ON "versoes_modelo_checklist"("modelo_id", "versao");

-- CreateIndex
CREATE INDEX "execucoes_loja_id_finalizada_em_idx" ON "execucoes"("loja_id", "finalizada_em");

-- CreateIndex
CREATE INDEX "execucoes_usuario_id_iniciada_em_idx" ON "execucoes"("usuario_id", "iniciada_em");

-- CreateIndex
CREATE INDEX "respostas_execucao_id_idx" ON "respostas"("execucao_id");

-- CreateIndex
CREATE UNIQUE INDEX "planos_acao_resposta_id_key" ON "planos_acao"("resposta_id");

-- CreateIndex
CREATE INDEX "planos_acao_loja_id_status_prazo_idx" ON "planos_acao"("loja_id", "status", "prazo");

-- CreateIndex
CREATE INDEX "fotos_resposta_id_idx" ON "fotos"("resposta_id");

-- CreateIndex
CREATE INDEX "fotos_plano_acao_id_idx" ON "fotos"("plano_acao_id");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versoes_modelo_checklist" ADD CONSTRAINT "versoes_modelo_checklist_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "modelos_checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versoes_modelo_checklist" ADD CONSTRAINT "versoes_modelo_checklist_cargo_permitido_id_fkey" FOREIGN KEY ("cargo_permitido_id") REFERENCES "cargos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_modelo_checklist" ADD CONSTRAINT "itens_modelo_checklist_versao_modelo_id_fkey" FOREIGN KEY ("versao_modelo_id") REFERENCES "versoes_modelo_checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execucoes" ADD CONSTRAINT "execucoes_versao_modelo_id_fkey" FOREIGN KEY ("versao_modelo_id") REFERENCES "versoes_modelo_checklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execucoes" ADD CONSTRAINT "execucoes_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execucoes" ADD CONSTRAINT "execucoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respostas" ADD CONSTRAINT "respostas_execucao_id_fkey" FOREIGN KEY ("execucao_id") REFERENCES "execucoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respostas" ADD CONSTRAINT "respostas_item_modelo_id_fkey" FOREIGN KEY ("item_modelo_id") REFERENCES "itens_modelo_checklist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_acao" ADD CONSTRAINT "planos_acao_resposta_id_fkey" FOREIGN KEY ("resposta_id") REFERENCES "respostas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_acao" ADD CONSTRAINT "planos_acao_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_acao" ADD CONSTRAINT "planos_acao_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_resposta_id_fkey" FOREIGN KEY ("resposta_id") REFERENCES "respostas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_plano_acao_id_fkey" FOREIGN KEY ("plano_acao_id") REFERENCES "planos_acao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

