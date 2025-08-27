'use client';
import React, { useState } from 'react';

interface AuthFormProps {
  mode?: 'login' | 'register';
  onSubmit: (data: any) => void;
  error?: string;
}

export default function AuthForm({ mode = 'login', onSubmit, error }: AuthFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = mode === 'register' ? formData : { email: formData.email, password: formData.password };
    onSubmit(data);
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: 24 }}>
      <h2>{mode === 'login' ? 'Login' : 'Register'}</h2>
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {mode === 'register' && (
          <input
            type="text"
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            style={{ padding: 8 }}
          />
        )}
        
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          style={{ padding: 8 }}
        />
        
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          style={{ padding: 8 }}
        />
        
        <button type="submit" style={{ padding: 12, backgroundColor: '#007bff', color: 'white', border: 'none' }}>
          {mode === 'login' ? 'Login' : 'Register'}
        </button>
      </form>
    </div>
  );
}
