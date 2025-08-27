import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';

const port = parseInt(process.env.PORT || '4000', 10);
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
});

io.of('/chat').on('connection', (socket) => {
  console.log('client connected', socket.id);
  socket.on('ping', () => socket.emit('pong'));

  socket.on('message:send', (payload) => {
    if (!payload || typeof payload.body !== 'string') return;
    
    const msg = {
      id: Math.random().toString(36).slice(2),
      body: payload.body,
      createdAt: new Date().toISOString(),
      senderId: payload.senderId || 'unknown'
    };
    
    // Broadcast to all connected clients
    socket.nsp.emit('message:received', msg);
  });
});

server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
}); 