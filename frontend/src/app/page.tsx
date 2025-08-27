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
                  <div style={{ 
                    marginBottom: 10,
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <img 
                      src={m.imageUrl} 
                      alt="Shared image"
                      style={{
                        width: '100%',
                        maxHeight: '300px',
                        borderRadius: 15,
                        objectFit: 'cover',
                        transition: 'transform 0.3s ease',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                      }}
                      onClick={(e) => {
                        // Simple zoom effect on click
                        const img = e.currentTarget;
                        if (img.style.transform === 'scale(1.05)') {
                          img.style.transform = 'scale(1)';
                        } else {
                          img.style.transform = 'scale(1.05)';
                        }
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
            gap: 20,
            background: 'rgba(102,126,234,0.1)',
            padding: 15,
            borderRadius: 15,
            boxShadow: '0 4px 15px rgba(102,126,234,0.1)',
            transition: 'all 0.3s ease'
          }}>
            <div style={{
              position: 'relative',
              width: 80,
              height: 80,
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}>
              <img 
                src={imagePreview} 
                alt="Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transition: 'transform 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ 
                margin: 0, 
                fontSize: '1rem', 
                color: '#555',
                fontWeight: 'bold'
              }}>
                Ready to send
              </p>
              <p style={{ 
                margin: '5px 0 0 0', 
                fontSize: '0.9rem', 
                color: '#777',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}>
                <span style={{ fontSize: '1.1rem' }}>📷</span>
                {selectedImage?.name.length > 25 ? 
                  selectedImage?.name.substring(0, 25) + '...' : 
                  selectedImage?.name}
              </p>
            </div>
            <button
              onClick={removeImage}
              style={{
                background: 'linear-gradient(45deg, #ff6b6b, #ee5a52)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                width: 36,
                height: 36,
                cursor: 'pointer',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(255,107,107,0.3)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 6px 15px rgba(255,107,107,0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 10px rgba(255,107,107,0.3)';
              }}
              title="Remove image"
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
        {/* Emoji and Image Controls - Moved above input */}
        <div style={{ 
          display: 'flex', 
          gap: 10, 
          marginBottom: 15, 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ 
            display: 'flex', 
            gap: 10, 
            alignItems: 'center'
          }}>
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
                padding: '12px',
                background: 'linear-gradient(45deg, #10b981, #059669)',
                border: 'none',
                borderRadius: '15px',
                cursor: 'pointer',
                fontSize: '1.2rem',
                width: 45,
                height: 45,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(16,185,129,0.3)';
              }}
              title="Upload Image"
            >
              📷
            </button>
            
            {/* Emoji Button */}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{
                padding: '12px',
                background: 'linear-gradient(45deg, #ffd93d, #ff6b6b)',
                border: 'none',
                borderRadius: '15px',
                cursor: 'pointer',
                fontSize: '1.2rem',
                width: 45,
                height: 45,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(255,107,107,0.3)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,107,107,0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(255,107,107,0.3)';
              }}
              title="Add Emoji"
            >
              😊
            </button>
          </div>
          
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            {selectedImage && (
              <span style={{ 
                background: 'rgba(102,126,234,0.1)', 
                padding: '5px 10px', 
                borderRadius: 15,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}>
                <span>📷</span> {selectedImage.name.length > 20 ? selectedImage.name.substring(0, 20) + '...' : selectedImage.name}
              </span>
            )}
          </div>
        </div>
        
        {/* Emoji Picker - Floating above input */}
        {showEmojiPicker && (
          <div ref={emojiPickerRef} style={{
            position: 'absolute',
            background: 'white',
            borderRadius: 15,
            padding: 15,
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: 8,
            marginBottom: 10,
            zIndex: 1000,
            maxWidth: '400px',
            transform: 'translateY(-10px)'
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
                  borderRadius: 10,
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                  e.currentTarget.style.transform = 'scale(1.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        
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
          </div>
          
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