import { useState } from 'react';
import './login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Add your login logic here
    console.log('Login attempted with:', { email, password });
    
    // Example: Redirect to dashboard after successful login
    // window.location.href = '/dashboard';
    
    alert('Login functionality to be implemented');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, isLastInput: boolean) => {
    if (e.key === 'Enter' && !isLastInput) {
      e.preventDefault();
      const nextInput = (e.currentTarget.nextElementSibling as HTMLInputElement);
      nextInput?.focus();
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="logo-section">
          <div className="logo">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <h1 className="app-name">COOZIE</h1>
          <p className="app-tagline">Share your music vibe with friends</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <input 
              type="email" 
              className="form-input" 
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, false)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <input 
              type="password" 
              className="form-input" 
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, true)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-button">Log In</button>
        </form>

        <div className="signup-section">
          Don't have an account? 
          <a href="/signup" className="signup-link">Sign Up</a>
        </div>

        <div className="terms-section">
          By continuing, you agree to Cozie's 
          <a href="/terms"> Terms of Service</a> 
          {' '}and 
          <a href="/privacy"> Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}
