import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { router as apiRouter } from './routes/index.js';

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadDir));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api', apiRouter);

export default app; 