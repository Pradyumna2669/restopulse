import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRouter } from './routes/api.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRouter);

app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'RestoPulse POS Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 RestoPulse POS Core Backend running on port ${PORT}`);
  console.log(`👉 API Endpoint: http://localhost:${PORT}/api`);
  console.log(`👉 OpenWA Integration: Target http://localhost:2785`);
  console.log(`====================================================`);
});
