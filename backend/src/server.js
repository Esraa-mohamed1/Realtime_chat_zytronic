import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { prisma } from './config/prisma.js';

const port = parseInt(process.env.PORT || '4000', 10);
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
});

io.of('/chat').on('connection', async (socket) => {
  console.log('client connected', socket.id);
  
  socket.on('ping', () => socket.emit('pong'));

  // Load recent messages when client connects
  socket.on('load:messages', async () => {
    try {
      const messages = await prisma.message.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: { id: true, name: true }
          }
        }
      });
      
      socket.emit('messages:loaded', messages.reverse());
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  });

  socket.on('message:send', async (payload) => {
    if (!payload || typeof payload.body !== 'string') return;
    
    try {
      // Store message in database
      const message = await prisma.message.create({
        data: {
          body: payload.body,
          type: !payload.type || payload.type === 'text' ? 'TEXT' : payload.type.toUpperCase(),
          imageUrl: payload.imageUrl,
          senderId: payload.senderId || 'unknown',
          conversationId: 'default' // For now, using a default conversation
        },
        include: {
          sender: {
            select: { id: true, name: true }
          }
        }
      });

      const msg = {
        id: message.id,
        body: message.body,
        type: message.type,
        imageUrl: message.imageUrl,
        createdAt: message.createdAt.toISOString(),
        senderId: message.senderId,
        sender: message.sender
      };

      socket.nsp.emit('message:received', msg);
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('message:error', { error: 'Failed to save message' });
    }
  });
});

server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});