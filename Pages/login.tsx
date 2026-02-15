import { useState } from 'react';
import './login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Create user details object
    const userDetails = {
      email: email.trim(),
      password: password
    };

    // Log the data being sent (for debugging)
    console.log('Sending login request with:', userDetails);

    // Send login request to your backend
    fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userDetails),
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.message || 'Login failed');
        });
      }
      return response.json();
    })
    .then(data => {
      // Successful login
      console.log('Login successful:', data);
      
      // Store user data in localStorage or context if needed
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // You might want to set up authentication token
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      // Show success message (optional)
      alert('Login successful! Redirecting...');
      
      // Redirect to dashboard or home page
      window.location.href = '/dashboard';
    })
    .catch(err => {
      // Handle errors
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(errorMessage);
      console.error('Login error:', err);
      alert(errorMessage);
    })
    .finally(() => {
      setIsLoading(false);
    });
  };

  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, isLastInput: boolean) => {
    if (e.key === 'Enter' && !isLastInput) {
      e.preventDefault();
      const nextInput = (e.currentTarget.nextElementSibling as HTMLInputElement);
      nextInput?.focus();
    }
  };

  // Function to handle login with different providers (optional)
  const handleSocialLogin = async (provider: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      // Redirect to OAuth provider
      window.location.href = `/api/auth/${provider}`;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `${provider} login failed`;
      setError(errorMessage);
      setIsLoading(false);
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

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

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
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>

          <div className="forgot-password">
            <a href="/forgot-password">Forgot Password?</a>
          </div>

          <button 
            type="submit" 
            className={`login-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

         {/* Optional: Social login buttons */}
        <div className="social-login">
          <p className="social-login-text">Or login with</p>
          <div className="social-buttons">
            <button 
              onClick={() => handleSocialLogin('google')}
              className="social-button google"
              disabled={isLoading}
            >
              Google
            </button>
            <button 
              onClick={() => handleSocialLogin('spotify')}
              className="social-button spotify"
              disabled={isLoading}
            >
              Spotify
            </button>
            <button 
              onClick={() => handleSocialLogin('apple')}
              className="social-button apple"
              disabled={isLoading}
            >
              Apple
            </button>
          </div>
        </div>

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
