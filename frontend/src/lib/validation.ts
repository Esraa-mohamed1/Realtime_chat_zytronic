export interface ValidationError {
  field: string;
  message: string;
}

export const validateEmail = (email: string): string | null => {
  if (!email) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters long';
  return null;
};

export const validateName = (name: string): string | null => {
  if (!name) return 'Name is required';
  if (name.length < 2) return 'Name must be at least 2 characters long';
  if (name.length > 50) return 'Name must be less than 50 characters';
  return null;
};

export const validateAuthForm = (data: { email: string; password: string; name?: string }, mode: 'login' | 'register'): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Check if all fields are empty first
  if (mode === 'login') {
    if (!data.email.trim() && !data.password.trim()) {
      return [{ field: 'general', message: 'Please fill in all required fields' }];
    }
  } else { // register mode
    if (!data.email.trim() && !data.password.trim() && (!data.name || !data.name.trim())) {
      return [{ field: 'general', message: 'Please fill in all required fields' }];
    }
  }

  const emailError = validateEmail(data.email);
  if (emailError) errors.push({ field: 'email', message: emailError });

  const passwordError = validatePassword(data.password);
  if (passwordError) errors.push({ field: 'password', message: passwordError });

  if (mode === 'register' && data.name !== undefined) {
    const nameError = validateName(data.name);
    if (nameError) errors.push({ field: 'name', message: nameError });
  }

  return errors;
};
