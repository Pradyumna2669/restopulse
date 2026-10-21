import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRouter } from './routes/api.routes';
import { securityService } from './services/securityHardening.service';
import { systemHealthService } from './services/systemHealth.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');
app.use(securityService.securityHeadersMiddleware);
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRouter);

// Deep Health & Diagnostics Endpoint (Phase 10)
app.get('/health', (req, res) => {
  res.json(systemHealthService.getDeepHealthReport());
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 RestoPulse POS Core Backend running on port ${PORT}`);
  console.log(`👉 API Endpoint: http://localhost:${PORT}/api`);
  console.log(`👉 OpenWA Integration: Target http://localhost:2785`);
  console.log(`====================================================`);
});
