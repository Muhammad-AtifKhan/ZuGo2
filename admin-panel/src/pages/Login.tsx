import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import './Login.css';

const LoginPage = () => {
  const { user, loading, isAdmin, authError: contextAuthError, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  // Sync context error to local error state
  useEffect(() => {
    if (contextAuthError) {
      setError(contextAuthError);
    }
  }, [contextAuthError]);

  if (loading) {
    return (
      <div className="login-container flex items-center justify-center">
        <div className="login-card card animate-fade-in text-center">
          <div className="logo-circle-lg mx-auto mb-4">
            <span className="logo-text-lg">Z</span>
          </div>
          <h2>Loading...</h2>
          <p>Please wait</p>
        </div>
      </div>
    );
  }

  // If user is authenticated AND verified as admin, redirect to dashboard
  if (user && isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      await login(normalizedEmail, password);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const auth = getAuth();
      const normalizedEmail = email.trim().toLowerCase();

      await sendPasswordResetEmail(auth, normalizedEmail, {
        url: window.location.origin + '/login',
        handleCodeInApp: false,
      });

      setSuccess(`✅ Password reset email sent to ${normalizedEmail}.\n\n📧 Please check your inbox (and spam folder).`);
      setEmail('');

      setTimeout(() => {
        setIsResetMode(false);
        setSuccess('');
      }, 8000);

    } catch (err: any) {
      console.error('Password reset error:', err);

      if (err.code === 'auth/user-not-found') {
        setError('❌ No account found with this email address.');
      } else if (err.code === 'auth/invalid-email') {
        setError('❌ Invalid email address format.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('❌ Too many requests. Please try again later.');
      } else {
        setError(err.message || 'Failed to send reset email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-circle-lg">
            <span className="logo-text-lg">Z</span>
          </div>
          <h2>ZuGo2 Admin</h2>
          <p>{isResetMode ? 'Reset Your Password' : 'Admin Operations Portal'}</p>
        </div>

        {error && (
          <div className="message-box error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="message-box success">
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}

        {!isResetMode ? (
          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label>Admin Email</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  placeholder="admin@zugo2.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Verifying Profile...' : 'Access Portal'}
            </button>

            <button
              type="button"
              className="text-link"
              onClick={() => {
                setIsResetMode(true);
                setError('');
                setSuccess('');
              }}
            >
              Forgot Password?
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="login-form">
            <div className="input-group">
              <label>Enter your admin email</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  placeholder="admin@zugo2.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <p className="input-hint">
                We'll send a password reset link to this email.
              </p>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Reset Email'}
            </button>

            <button
              type="button"
              className="text-link back-link"
              onClick={() => {
                setIsResetMode(false);
                setError('');
                setSuccess('');
              }}
            >
              <ArrowLeft size={16} />
              Back to Login
            </button>
          </form>
        )}

        <div className="login-footer">
          <p className="footer-text">
            Secure access only • All attempts are logged
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;