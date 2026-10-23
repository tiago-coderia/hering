import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import { config } from './config';
import { errorHandler } from './middlewares/errorHandler';
import { authRouter } from './routes/authRoutes';
import { storeRouter } from './routes/storeRoutes';
import { userRouter } from './routes/userRoutes';
import { checklistRouter } from './routes/checklistRoutes';
import { actionPlanRouter } from './routes/actionPlanRoutes';
import { photoRouter } from './routes/photoRoutes';
import { dashboardRouter } from './routes/dashboardRoutes';
import { healthRouter } from './routes/healthRoutes';

export const app = express();

// Middlewares Globais
app.use(
  cors({
    origin: (origin, callback) => {
      // Permite localhost e chamadas sem origin (mobile / curl)
      if (!origin || origin.includes('localhost') || origin === config.corsOrigin) {
        callback(null, true);
      } else {
        callback(null, true); // Permissivo em dev/demonstração controlada
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Documentação OpenAPI / Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rotas da API v1
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/lojas', storeRouter);
app.use('/api/v1/usuarios', userRouter);
app.use('/api/v1', checklistRouter);
app.use('/api/v1/planos-acao', actionPlanRouter);
app.use('/api/v1/fotos', photoRouter);
app.use('/api/v1/dashboard', dashboardRouter);

// Middleware Centralizado de Tratamento de Erros
app.use(errorHandler);

