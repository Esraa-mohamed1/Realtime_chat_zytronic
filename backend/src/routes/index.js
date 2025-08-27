import { Router } from 'express';

export const router = Router();

router.get('/me', (_req, res) => {
  res.json({ ok: true });
}); 