'use client';
import React, { useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';

type ChatMessage = { id: string; body: string; createdAt: string };

export default function HomePage() {
  const [status, setStatus] = useState('connecting...');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => setStatus('connected');
    const onPong = () => setStatus('pong received');
    const onReceived = (msg: ChatMessage) => setMessages((prev) => [...prev, msg]);

    socket.on('connect', onConnect);
    socket.emit('ping');
    socket.on('pong', onPong);
    socket.on('message:received', onReceived);

    return () => {
      socket.off('connect', onConnect);
      socket.off('pong', onPong);
      socket.off('message:received', onReceived);
    };
  }, []);

  const onSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const socket = getSocket();
    socket.emit('message:send', { body: trimmed });
    setInput('');
  };

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h1>Realtime Chat</h1>
      <p>Socket status: {status}</p>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={onSend} style={{ padding: '8px 12px' }}>Send</button>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, marginTop: 16 }}>
        {messages.map((m) => (
          <li key={m.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <div style={{ fontSize: 14, color: '#666' }}>{new Date(m.createdAt).toLocaleTimeString()}</div>
            <div>{m.body}</div>
          </li>
        ))}
      </ul>
    </main>
  );
} 