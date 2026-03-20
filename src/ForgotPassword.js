import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './admin/firebase-config';
import { MDBContainer, MDBInput } from 'mdb-react-ui-kit';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import AirplaneTicketIcon from '@mui/icons-material/AirplaneTicket';

const GlassPane = styled.div`
  background: rgba(15, 17, 26, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border-radius: 24px;
  overflow: hidden;
  max-width: 600px;
  margin: 0 auto;
  padding: 4rem;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 2;
`;

const CustomInput = styled.div`
  margin-bottom: 1.5rem;
  .form-control {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    color: white;
    font-family: inherit;
    border-radius: 12px;
    padding: 12px 16px;
    &:focus {
      background: rgba(255,255,255,0.1);
      border-color: var(--color-primary);
      box-shadow: 0 0 0 4px rgba(116, 81, 248, 0.1);
    }
  }
  .form-label {
    color: var(--color-gray);
  }
`;

const Button = styled.button`
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: white;
  border: none;
  padding: 16px 32px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 24px rgba(116, 81, 248, 0.3);
  margin-top: 1rem;
  width: 100%;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(116, 81, 248, 0.5);
  }
`;

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSubmitted(true);
    } catch (err) {
      console.error('Firebase error:', err.code, err.message);
      const messages = {
        'auth/user-not-found': 'No account found with this email address.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/operation-not-allowed': 'Password reset is not enabled. Please contact support.',
        'auth/network-request-failed': 'Network error. Check your connection and try again.',
      };
      setError(messages[err.code] || `Error: ${err.message}`);
    }
  };

  return (
    <div className="auth-bg">
      <MDBContainer className="auth-card">
        <GlassPane>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              height: '60px', width: '60px',
              borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 8px 32px rgba(116, 81, 248, 0.3)'
            }}>
              <AirplaneTicketIcon style={{ height: "30px", width: "30px", color: "var(--color-white)" }} />
            </div>
            <h2 className="fw-bold mb-2" style={{ color: 'var(--color-white)' }}>Reset Password</h2>
            <p style={{ color: 'var(--color-gray)' }}>
              Enter your email address to receive password reset instructions.
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit}>
              <CustomInput>
                <MDBInput 
                  label='Admin Email Address' 
                  type='email' 
                  size="lg" 
                  contrast 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </CustomInput>
              <Button type="submit">Send Reset Link</Button>
              {error && <p style={{ color: '#ef4444', marginTop: '1rem', textAlign: 'center' }}>{error}</p>}
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <h4 style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '1rem' }}>Check Your Email</h4>
              <p style={{ color: 'var(--color-text-darker)' }}>
                We've sent password reset instructions to <strong>{email}</strong>
              </p>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} style={{ color: 'var(--color-gray)', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}>
              &larr; Back to Login
            </a>
          </div>
        </GlassPane>
      </MDBContainer>
    </div>
  );
}

export default ForgotPassword;
