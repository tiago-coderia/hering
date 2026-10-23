import { app } from './app';
import { config } from './config';
import fs from 'fs';

// Garante que o diretório de uploads exista na inicialização
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`🚀 Checklist API rodando na porta ${config.port}`);
  console.log(`📚 Documentação Swagger: http://localhost:${config.port}/api/docs`);
  console.log(`📁 Armazenamento de Fotos: ${config.uploadDir}`);
  console.log(`====================================================`);
});

