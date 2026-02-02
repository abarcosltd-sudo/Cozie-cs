import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './verification.css';

export default function Verification() {
  const navigate = useNavigate();
  const [codeValues, setCodeValues] = useState(['', '', '', '', '', '']);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [userEmail, setUserEmail] = useState('user@example.com');
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const resendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Get email from session storage or URL params
    const email = sessionStorage.getItem('userEmail') || 'user@example.com';
    setUserEmail(email);

    // Focus first input
    inputsRef.current[0]?.focus();

    // Start resend timer
    startResendTimer();

    return () => {
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
      }
    };
  }, []);

  const startResendTimer = () => {
    setCanResend(false);
    setResendCountdown(60);

    resendTimerRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          if (resendTimerRef.current) {
            clearInterval(resendTimerRef.current);
          }
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCodeInput = (index: number, value: string) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) {
      return;
    }

    const newValues = [...codeValues];
    newValues[index] = value.slice(-1); // Only keep last character
    setCodeValues(newValues);

    // Auto-advance to next input
    if (newValues[index] && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (index === 5 && newValues[index]) {
      const allFilled = newValues.every((val) => val !== '');
      if (allFilled) {
        setTimeout(() => {
          handleVerification();
        }, 300);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeValues[index] && index > 0) {
      e.preventDefault();
      const newValues = [...codeValues];
      newValues[index - 1] = '';
      setCodeValues(newValues);
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');

    const newValues = [...codeValues];
    Array.from(pastedData).forEach((char, i) => {
      if (index + i < 6) {
        newValues[index + i] = char;
      }
    });
    setCodeValues(newValues);

    // Focus the next empty input or last input
    const nextEmpty = newValues.findIndex((val) => val === '');
    if (nextEmpty !== -1) {
      inputsRef.current[nextEmpty]?.focus();
    } else {
      inputsRef.current[5]?.focus();
    }
  };

  const handleVerification = async () => {
    const code = codeValues.join('');

    setShowError(false);
    setErrorMessage('');

    if (code.length !== 6) {
      setErrorMessage('Please enter all 6 digits');
      setShowError(true);
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      // For demo: accept any 6-digit code
      if (code.length === 6) {
        // Success
        setSuccessMessage('✓ Verification successful! Redirecting...');
        setShowSuccess(true);

        // Add success animation to inputs
        inputsRef.current.forEach((input) => {
          if (input) {
            input.style.borderColor = '#22c55e';
            input.style.background = 'rgba(34, 197, 94, 0.1)';
          }
        });

        // Redirect after 2 seconds
        setTimeout(() => {
          navigate('/onboarding');
        }, 2000);
      } else {
        setIsLoading(false);
        setErrorMessage('Invalid verification code. Please try again.');
        setShowError(true);

        // Clear inputs and refocus
        setCodeValues(['', '', '', '', '', '']);
        inputsRef.current[0]?.focus();
      }
    }, 1500);
  };

  const handleResendCode = () => {
    if (!canResend) return;

    // Simulate API call
    setSuccessMessage('✓ Verification code resent!');
    setShowSuccess(true);

    setTimeout(() => {
      setShowSuccess(false);
      setSuccessMessage('');
    }, 3000);

    startResendTimer();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleVerification();
  };

  return (
    <div className="verify-page">
      <div className="verify-container">
        <div className="logo-section">
          <div className="logo">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <h1 className="app-name">COOZIE</h1>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div className="email-icon">📧</div>
          <h2 className="verify-title">Check Your Email</h2>
          <p className="verify-subtitle">
            We've sent a verification code to
            <br />
            <span className="email-address">{userEmail}</span>
          </p>
        </div>

        {showSuccess && (
          <div className="success-message show">
            {successMessage}
          </div>
        )}

        {showError && (
          <div className="error-message show">
            {errorMessage}
          </div>
        )}

        <form className="verification-form" onSubmit={handleSubmit}>
          <div className="code-inputs">
            {codeValues.map((value, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                type="text"
                className="code-input"
                maxLength={1}
                pattern="[0-9]"
                inputMode="numeric"
                autoComplete="off"
                value={value}
                onChange={(e) => handleCodeInput(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={(e) => handlePaste(index, e)}
                required
              />
            ))}
          </div>

          <button 
            type="submit" 
            className="verify-button" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </button>
        </form>

        <div className="resend-section">
          Didn't receive the code?{' '}
          <a
            className={`resend-link ${!canResend ? 'disabled' : ''}`}
            onClick={handleResendCode}
            style={{ pointerEvents: canResend ? 'auto' : 'none' }}
          >
            Resend
          </a>
          {resendCountdown > 0 && (
            <div className="timer">
              Resend available in {resendCountdown}s
            </div>
          )}
        </div>

        <div className="back-link">
          <a href="/signup">← Back to Sign Up</a>
        </div>

        <div className="help-text">
          <strong>💡 Tip:</strong> Check your spam folder if you don't see the email. The code expires in 10 minutes.
        </div>

        <div className="progress-indicator">
          <div className="progress-dot active"></div>
          <div className="progress-dot active"></div>
          <div className="progress-dot"></div>
          <div className="progress-dot"></div>
        </div>
      </div>
    </div>
  );
}
