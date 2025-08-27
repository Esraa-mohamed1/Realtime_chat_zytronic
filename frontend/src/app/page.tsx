'use client';
import React, { useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';
import { apiPost, apiGet } from '../lib/api';
import AuthForm from '../components/AuthForm';

type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

type Message = {
  id: string;
  body: string;
  createdAt: string;
};

export default function HomePage() {
  const [status, setStatus] = useState('connecting...');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUser();
    }
  }, []);

  const loadUser = async () => {
    try {
      const userData = await apiGet('/api/me');
      setUser(userData as User);
    } catch (error) {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const handleAuth = async (data: any) => {
    try {
      setAuthError('');
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const result = await apiPost(endpoint, data);
      
      localStorage.setItem('token', result.token);
      setUser(result.user);
      setAuthMode('login');
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    const onConnect = () => setStatus('connected');
    const onPong = () => setStatus('pong received');
    const onReceived = (msg: Message) => setMessages((prev) => [...prev, msg]);

    socket.on('connect', onConnect);
    socket.emit('ping');
    socket.on('pong', onPong);
    socket.on('message:received', onReceived);

    return () => {
      socket.off('connect', onConnect);
      socket.off('pong', onPong);
      socket.off('message:received', onReceived);
    };
  }, [user]);

  const onSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const socket = getSocket();
    socket.emit('message:send', { body: trimmed });
    setInput('');
  };

  if (!user) {
    return (
      <main style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
        <h1>Realtime Chat</h1>
        <AuthForm 
          mode={authMode} 
          onSubmit={handleAuth} 
          error={authError} 
        />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button 
            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }}
          >
            {authMode === 'login' ? 'Need an account? Register' : 'Have an account? Login'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Realtime Chat</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>Welcome, {user.name}</span>
          <button onClick={handleLogout} style={{ padding: '8px 12px', background: '#dc3545', color: 'white', border: 'none' }}>
            Logout
          </button>
        </div>
      </div>
      
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