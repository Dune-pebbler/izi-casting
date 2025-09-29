import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { auth, googleProvider } from '../firebase';
import { 
  signInWithRedirect, 
  signInWithPopup,
  getRedirectResult, 
  onAuthStateChanged 
} from 'firebase/auth';

function LoginView() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [redirectChecked, setRedirectChecked] = useState(false);

  // Handle redirect result when component mounts
  useEffect(() => {
    if (redirectChecked) return;
    
    const handleRedirectResult = async () => {
      console.log('🔍 Checking for redirect result...');
      console.log('🔍 Current auth state:', auth.currentUser);
      console.log('🔍 Auth domain:', auth.config.authDomain);
      setRedirectChecked(true);
      
      try {
        const result = await getRedirectResult(auth);
        console.log('📋 Redirect result:', result);
        if (result) {
          console.log('✅ User authenticated via redirect:', {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
            providerId: result.providerId,
            operationType: result.operationType
          });
          setUser(result.user);
        } else {
          console.log('ℹ️ No redirect result found');
          console.log('ℹ️ This could mean:');
          console.log('  - User is not coming from a redirect');
          console.log('  - Google auth is not properly configured');
          console.log('  - Redirect URL is not authorized in Firebase console');
        }
      } catch (error) {
        console.error('❌ Redirect result error:', error);
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          stack: error.stack
        });
        setError('Google sign-in failed: ' + error.message);
      }
    };
    handleRedirectResult();
  }, [redirectChecked]);

  // Listen for auth state changes
  useEffect(() => {
    console.log('👂 Setting up auth state listener...');
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔄 Auth state changed:', user ? {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        isAuthenticated: true
      } : { isAuthenticated: false });
      setUser(user);
    });
    return () => {
      console.log('🧹 Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  // Clean up any existing login-page class
  useEffect(() => {
    return () => {
      document.body.classList.remove('login-page');
    };
  }, []);

  // Redirect if user is already authenticated
  if (user) {
    console.log('🚀 User is authenticated, redirecting to admin:', {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    });
    return <Navigate to="/admin" replace />;
  }


  const handleGoogleLogin = async () => {
    console.log('🔐 Starting Google login process...');
    setIsLoading(true);
    setError('');

    try {
      console.log('🔄 Trying Google popup login...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('✅ Google popup login successful:', {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName
      });
      setUser(result.user);
    } catch (error) {
      console.error('❌ Google login error:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // If popup fails, try redirect as fallback
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/popup-blocked') {
        console.log('🔄 Popup failed, trying redirect...');
        try {
          await signInWithRedirect(auth, googleProvider);
          console.log('✅ Google redirect initiated successfully');
        } catch (redirectError) {
          console.error('❌ Google redirect also failed:', redirectError);
          setError('Google login failed: ' + redirectError.message);
          setIsLoading(false);
        }
      } else {
        setError('Google login failed: ' + error.message);
        setIsLoading(false);
      }
    }
  };

  return (
    <div 
      className="login-page-wrapper"
      style={{
        backgroundImage: "url('/dun_office.jpg')"
      }}
    >
      <div className="login-content">
        <div className="login-logo">
          <img src="/izicasting-logo.svg" alt="Izi Casting Logo" />
        </div>

        <div className="login-main">
          <h1 className="login-title">Admin Login</h1>

          <p className="login-instructions">
            Meld je aan om toegang te krijgen tot het admin dashboard
          </p>

          <div className="login-button-section">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="login-google-button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isLoading ? 'Inloggen...' : 'Inloggen met Google'}
            </button>
          </div>

          {error && <p className="login-error">{error}</p>}

          <div className="login-back-link">
            <Link to="/">
              <span className="back-arrow">←</span>
              Terug naar Display
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginView;
