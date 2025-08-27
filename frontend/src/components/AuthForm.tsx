'use client';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { validateAuthForm } from '../lib/validation';

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
    
    // Check if form is completely empty
    const isFormEmpty = !formData.email.trim() && !formData.password.trim() && (!formData.name || !formData.name.trim());
    
    if (isFormEmpty) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Client-side validation
    const validationErrors = validateAuthForm(formData, mode);
    
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => {
        toast.error(error.message);
      });
      return;
    }

    const data = mode === 'register' ? formData : { email: formData.email, password: formData.password };
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {mode === 'register' && (
        <div>
          <label style={{ display: 'block', marginBottom: 8, color: '#333', fontWeight: 'bold' }}>
            Name
          </label>
          <input
            type="text"
            placeholder="Enter your name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={{
              width: '100%',
              padding: '15px 20px',
              border: '2px solid #e1e5e9',
              borderRadius: 15,
              fontSize: '1rem',
              outline: 'none',
              transition: 'all 0.3s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#667eea';
              e.target.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e1e5e9';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
      )}
      
      <div>
        <label style={{ display: 'block', marginBottom: 8, color: '#333', fontWeight: 'bold' }}>
          Email
        </label>
        <input
          type="text"
          placeholder="Enter your email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          style={{
            width: '100%',
            padding: '15px 20px',
            border: '2px solid #e1e5e9',
            borderRadius: 15,
            fontSize: '1rem',
            outline: 'none',
            transition: 'all 0.3s',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#667eea';
            e.target.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e1e5e9';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>
      
      <div>
        <label style={{ display: 'block', marginBottom: 8, color: '#333', fontWeight: 'bold' }}>
          Password
        </label>
        <input
          type="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          style={{
            width: '100%',
            padding: '15px 20px',
            border: '2px solid #e1e5e9',
            borderRadius: 15,
            fontSize: '1rem',
            outline: 'none',
            transition: 'all 0.3s',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#667eea';
            e.target.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e1e5e9';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>
      
      <button 
        type="submit" 
        style={{
          padding: '15px 20px',
          background: 'linear-gradient(45deg, #667eea, #764ba2)',
          color: 'white',
          border: 'none',
          borderRadius: 15,
          fontSize: '1.1rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'all 0.3s',
          boxShadow: '0 4px 15px rgba(102,126,234,0.3)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(102,126,234,0.4)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(102,126,234,0.3)';
        }}
      >
        {mode === 'login' ? 'Login ✨' : 'Register ✨'}
      </button>
    </form>
  );
}
