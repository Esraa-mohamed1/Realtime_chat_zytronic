import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';

export class AuthService {
  static async hashPassword(password) {
    return bcrypt.hash(password, 12);
  }

  static async comparePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  static generateToken(userId) {
    const secret = process.env.JWT_SECRET || 'dev-secret';
    return jwt.sign({ userId }, secret, { expiresIn: '7d' });
  }

  static async register(email, password, name) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await this.hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash: hashedPassword, name },
      select: { id: true, email: true, name: true, createdAt: true }
    });

    const token = this.generateToken(user.id);
    return { user, token };
  }

  static async login(email, password) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await this.comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken(user.id);
    return {
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      token
    };
  }
}
