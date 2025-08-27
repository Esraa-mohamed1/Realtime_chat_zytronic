import { Router } from 'express';
import { router as authRouter } from './auth.js';
import { router as uploadsRouter } from './uploads.js';
import { requireAuth } from '../middlewares/auth.js';
import { prisma } from '../config/prisma.js';

export const router = Router();

router.use('/auth', authRouter);
router.use('/uploads', uploadsRouter);

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: { id: true, email: true, name: true, createdAt: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}); 