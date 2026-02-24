import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './signup.css';

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [passwordStrength, setPasswordStrength] = useState('');
  const [passwordStrengthClass, setPasswordStrengthClass] = useState('');
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setFormData(prev => ({
      ...prev,
      password
    }));

    if (password.length === 0) {
      setShowPasswordStrength(false);
      return;
    }

    setShowPasswordStrength(true);

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;

    setPasswordStrengthClass('');
    
    if (strength <= 2) {
      setPasswordStrength('⚠️ Weak password');
      setPasswordStrengthClass('strength-weak');
    } else if (strength <= 4) {
      setPasswordStrength('⚡ Medium password');
      setPasswordStrengthClass('strength-medium');
    } else {
      setPasswordStrength('✓ Strong password');
      setPasswordStrengthClass('strength-strong');
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      confirmPassword: value
    }));
  };

  const showErrorMessage = (message: string) => {
    setErrorMessage(message);
    setShowError(true);
  };

  const handleSignup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setShowError(false);
    setErrorMessage('');

    const { fullName, username, email, password, confirmPassword } = formData;

    if (fullName.length < 2) {
      showErrorMessage('Full name must be at least 2 characters long');
      return;
    }

    if (username.length < 3) {
      showErrorMessage('Username must be at least 3 characters long');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      showErrorMessage('Username can only contain letters, numbers, and underscores');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showErrorMessage('Please enter a valid email address');
      return;
    }

    if (password.length < 8) {
      showErrorMessage('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      showErrorMessage('Passwords do not match');
      return;
    }

    const signupData = {
      fullName,
      username,
      email,
      password
    };

    console.log('Signup data:', signupData);

    setIsLoading(true);

    setTimeout(() => {
      // Success - redirect to email verification
      // For now, redirect to login
      navigate('/login');
    }, 1500);
  };

  const handleSocialSignup = (provider: string) => {
    console.log(`Signing up with ${provider}`);
    alert(`${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-up to be implemented`);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, isLastInput: boolean) => {
    if (e.key === 'Enter' && !isLastInput) {
      e.preventDefault();
      const nextInput = (e.currentTarget.nextElementSibling as HTMLInputElement);
      nextInput?.focus();
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="logo-section">
          <div className="logo">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <h1 className="app-name">COOZIE</h1>
          <p className="app-tagline">Share your music vibe with friends</p>
          <p className="page-title">Create your account</p>
        </div>

        <div className={`error-message ${showError ? 'show' : ''}`}>
          {errorMessage}
        </div>

        <form className="signup-form" onSubmit={handleSignup}>
          <div className="form-group">
            <input 
              type="text" 
              className="form-input" 
              id="fullName"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={handleInputChange}
              onKeyPress={(e) => handleKeyPress(e, false)}
              required
              minLength={2}
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <input 
              type="text" 
              className="form-input" 
              id="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleInputChange}
              onKeyPress={(e) => handleKeyPress(e, false)}
              required
              minLength={3}
              pattern="[a-zA-Z0-9_]+"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <input 
              type="email" 
              className="form-input" 
              id="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleInputChange}
              onKeyPress={(e) => handleKeyPress(e, false)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <input 
              type="password" 
              className="form-input" 
              id="password"
              placeholder="Password"
              value={formData.password}
              onChange={handlePasswordChange}
              onKeyPress={(e) => handleKeyPress(e, false)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            {showPasswordStrength && (
              <div className={`password-strength show ${passwordStrengthClass}`}>
                {passwordStrength}
              </div>
            )}
          </div>

          <div className="form-group">
            <input 
              type="password" 
              className="form-input" 
              id="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleConfirmPasswordChange}
              onKeyPress={(e) => handleKeyPress(e, true)}
              required
              autoComplete="new-password"
              style={
                formData.confirmPassword && formData.password !== formData.confirmPassword
                  ? { borderColor: '#ef4444' }
                  : formData.confirmPassword === formData.password && formData.confirmPassword.length > 0
                  ? { borderColor: '#22c55e' }
                  : {}
              }
            />
          </div>

          <button 
            type="submit" 
            className="signup-button" 
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="divider">
          <span>or continue with</span>
        </div>

        <div className="social-buttons">
          <button 
            type="button"
            className="social-button" 
            onClick={() => handleSocialSignup('google')}
          >
            <svg className="social-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
          <button 
            type="button"
            className="social-button" 
            onClick={() => handleSocialSignup('apple')}
          >
            <svg className="social-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Apple
          </button>
        </div>

        <div className="login-section">
          Already have an account? 
          <Link to="/login" className="login-link">Login</Link>
        </div>

        <div className="terms-section">
          By continuing, you agree to Coozie's 
          <a href="/terms"> Terms of Service</a> 
          {' '}and 
          <a href="/privacy"> Privacy Policy</a>
        </div>

        <div className="progress-indicator">
          <div className="progress-dot active"></div>
          <div className="progress-dot"></div>
          <div className="progress-dot"></div>
          <div className="progress-dot"></div>
        </div>
      </div>
    </div>
  );
}
