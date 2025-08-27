'use client';
import React, { useEffect, useState, useRef } from 'react';
import { getSocket } from '../lib/socket';
import { apiPost, apiGet } from '../lib/api';
import AuthForm from '../components/AuthForm';
import toast from 'react-hot-toast';

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
  senderId?: string;
};

type AuthResult = {
  user: User;
  token: string;
};

export default function HomePage() {
  const [status, setStatus] = useState('connecting...');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUser();
    }
  }, []);

  const loadUser = async () => {
    try {
      const userData = await apiGet<User>('/api/me');
      setUser(userData);
    } catch (error) {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const handleAuth = async (data: any) => {
    try {
      setAuthError('');
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const result = await apiPost<AuthResult>(endpoint, data);
      
      localStorage.setItem('token', result.token);
      setUser(result.user);
      setAuthMode('login');
      
      toast.success(authMode === 'login' ? 'Welcome back! 🎉' : 'Account created successfully! 🎉');
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast.success('Logged out successfully! 👋');
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

  const addEmoji = (emoji: string) => {
    setInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const onSend = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      toast.error('Please enter a message');
      return;
    }
    const socket = getSocket();
    socket.emit('message:send', { 
      body: trimmed,
      senderId: user?.id 
    });
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const emojis = ['😊', '😂', '❤️', '👍', '🎉', '🔥', '😍', '🤔', '😎', '🥳', '😭', '😡', '🤗', '👋', '💪', '✨'];

  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 20,
          padding: 40,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          maxWidth: 400,
          width: '100%'
        }}>
          <h1 style={{ 
            textAlign: 'center', 
            color: '#333',
            marginBottom: 30,
            fontSize: '2.5rem',
            fontWeight: 'bold'
          }}>
            💬 Chat App
          </h1>
          <AuthForm 
            mode={authMode} 
            onSubmit={handleAuth} 
            error={authError} 
          />
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#667eea', 
                cursor: 'pointer',
                fontSize: '1rem',
                textDecoration: 'underline'
              }}
            >
              {authMode === 'login' ? 'Need an account? Register' : 'Have an account? Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '20px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 20px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <div style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            color: 'white',
            fontWeight: 'bold'
          }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ margin: 0, color: '#333', fontSize: '1.5rem' }}>
              Welcome, {user.name}! 👋
            </h2>
            <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
              Status: {status === 'connected' ? '🟢 Online' : '🟡 Connecting...'}
            </p>
          </div>
        </div>
        <button 
          onClick={handleLogout} 
          style={{ 
            padding: '10px 20px', 
            background: 'linear-gradient(45deg, #ff6b6b, #ee5a52)',
            color: 'white', 
            border: 'none',
            borderRadius: 25,
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(255,107,107,0.3)',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Logout
        </button>
      </div>

      {/* Messages Container */}
      <div style={{
        flex: 1,
        padding: '20px 30px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 15
      }}>
        {messages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.8)',
            marginTop: 50,
            fontSize: '1.2rem'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: 20 }}>💬</div>
            <p>Start the conversation! Send your first message below.</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} style={{
              display: 'flex',
              justifyContent: m.senderId === user.id ? 'flex-end' : 'flex-start',
              marginBottom: 10
            }}>
              <div style={{
                maxWidth: '70%',
                padding: '15px 20px',
                borderRadius: m.senderId === user.id ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                background: m.senderId === user.id 
                  ? 'linear-gradient(45deg, #667eea, #764ba2)' 
                  : 'rgba(255, 255, 255, 0.9)',
                color: m.senderId === user.id ? 'white' : '#333',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)',
                fontSize: '1.1rem',
                lineHeight: 1.4
              }}>
                <div>{m.body}</div>
                <div style={{
                  fontSize: '0.8rem',
                  opacity: 0.7,
                  marginTop: 5,
                  textAlign: 'right'
                }}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '20px 30px',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255,255,255,0.2)'
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... 💬"
              style={{
                width: '100%',
                padding: '15px 20px',
                border: '2px solid #e1e5e9',
                borderRadius: 25,
                fontSize: '1rem',
                resize: 'none',
                minHeight: 50,
                maxHeight: 120,
                outline: 'none',
                transition: 'border-color 0.3s',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
            />
            
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div ref={emojiPickerRef} style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                background: 'white',
                borderRadius: 15,
                padding: 15,
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gap: 8,
                marginBottom: 10,
                zIndex: 1000
              }}>
                {emojis.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => addEmoji(emoji)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      padding: 5,
                      borderRadius: 5,
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            style={{
              padding: '15px',
              background: 'linear-gradient(45deg, #ffd93d, #ff6b6b)',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '1.5rem',
              width: 50,
              height: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(255,107,107,0.3)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            😊
          </button>
          
          <button 
            onClick={onSend} 
            style={{ 
              padding: '15px 25px', 
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              color: 'white', 
              border: 'none',
              borderRadius: 25,
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(102,126,234,0.3)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Send ✨
          </button>
        </div>
      </div>
    </div>
  );
} 