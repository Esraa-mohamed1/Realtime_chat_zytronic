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
  type?: 'TEXT' | 'IMAGE';
  imageUrl?: string;
  sender?: {
    id: string;
    name: string;
  };
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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      console.log('Auth data:', data);
      console.log('Auth mode:', authMode);
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      console.log('Sending request to:', endpoint);
      const result = await apiPost<AuthResult>(endpoint, data);
      
      localStorage.setItem('token', result.token);
      setUser(result.user);
      setAuthMode('login');
      
      toast.success(authMode === 'login' ? 'Welcome back! 🎉' : 'Account created successfully! 🎉');
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setMessages([]);
    toast.success('Logged out successfully! 👋');
  };

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    const onConnect = () => {
      setStatus('connected');
      // Load messages when connected
      socket.emit('load:messages');
      setIsLoadingMessages(true);
    };
    const onPong = () => setStatus('pong received');
    const onReceived = (msg: Message) => setMessages((prev) => [...prev, msg]);
    const onMessagesLoaded = (loadedMessages: Message[]) => {
      setMessages(loadedMessages);
      setIsLoadingMessages(false);
    };
    const onMessageError = (error: any) => {
      toast.error(error.error || 'Failed to send message');
    };

    socket.on('connect', onConnect);
    socket.emit('ping');
    socket.on('pong', onPong);
    socket.on('message:received', onReceived);
    socket.on('messages:loaded', onMessagesLoaded);
    socket.on('message:error', onMessageError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('pong', onPong);
      socket.off('message:received', onReceived);
      socket.off('messages:loaded', onMessagesLoaded);
      socket.off('message:error', onMessageError);
    };
  }, [user]);

  const addEmoji = (emoji: string) => {
    setInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/uploads/image`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload image');
    }
    
    const result = await response.json();
    return result.imageUrl;
  };

  const onSend = async () => {
    const trimmed = input.trim();
    const hasImage = selectedImage !== null;
    
    if (!trimmed && !hasImage) {
      toast.error('Please enter a message or select an image');
      return;
    }

    try {
      const socket = getSocket();
      
      if (hasImage) {
        // Upload image first
        const imageUrl = await uploadImage(selectedImage!);
        
        // Send image message
        socket.emit('message:send', { 
          body: trimmed || '📷 Image',
          senderId: user?.id,
          type: 'IMAGE',
          imageUrl
        });
        
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        // Send text message
        socket.emit('message:send', { 
          body: trimmed,
          senderId: user?.id,
          type: 'TEXT'
        });
      }
      
      setInput('');
    } catch (error) {
      toast.error('Failed to send message');
    }
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
        {isLoadingMessages ? (
          <div style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.8)',
            marginTop: 50,
            fontSize: '1.2rem'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 20 }}>⏳</div>
            <p>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
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
                {m.type === 'IMAGE' && m.imageUrl && (
                  <div style={{ marginBottom: 10 }}>
                    <img 
                      src={m.imageUrl} 
                      alt="Shared image"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        borderRadius: 10,
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                )}
                <div>{m.body}</div>
                <div style={{
                  fontSize: '0.8rem',
                  opacity: 0.7,
                  marginTop: 5,
                  textAlign: 'right'
                }}>
                  {m.sender?.name && (
                    <span style={{ marginRight: 8 }}>
                      {m.sender.name}
                    </span>
                  )}
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '15px 30px',
          borderTop: '1px solid rgba(255,255,255,0.2)',
          position: 'relative'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 15,
            background: 'rgba(102,126,234,0.1)',
            padding: 15,
            borderRadius: 10
          }}>
            <img 
              src={imagePreview} 
              alt="Preview"
              style={{
                width: 60,
                height: 60,
                borderRadius: 8,
                objectFit: 'cover'
              }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                Image selected: {selectedImage?.name}
              </p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#999' }}>
                Click Send to share this image
              </p>
            </div>
            <button
              onClick={removeImage}
              style={{
                background: '#ff6b6b',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: 30,
                height: 30,
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

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
          
          {/* Image Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '15px',
              background: 'linear-gradient(45deg, #10b981, #059669)',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '1.5rem',
              width: 50,
              height: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            📷
          </button>
          
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