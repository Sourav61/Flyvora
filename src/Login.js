import React, { useState } from 'react';
import { MDBBtn, MDBContainer, MDBCard, MDBCardBody, MDBRow, MDBCol, MDBInput } from 'mdb-react-ui-kit';
import './App.css';
import { useNavigate } from 'react-router-dom';
import AirplaneTicketIcon from '@mui/icons-material/AirplaneTicket';
import { useAuth0 } from '@auth0/auth0-react';
import styled from '@emotion/styled';

const GlassPane = styled.div`
  background: rgba(15, 17, 26, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border-radius: 24px;
  overflow: hidden;
  height: 600px;
  display: flex;
`;

const ContentCol = styled.div`
  flex: 1;
  padding: 4rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const FormContainer = styled.div`
  animation: slideUp 0.6s ease-out;
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
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

const RoleToggleContainer = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 2rem;
  padding: 6px;
  background: rgba(0,0,0,0.2);
  border-radius: 16px;
  width: fit-content;
`;

const RoleBtn = styled.button`
  background: ${props => props.active ? 'rgba(255,255,255,0.15)' : 'transparent'};
  color: ${props => props.active ? 'white' : 'var(--color-gray)'};
  border: none;
  padding: 8px 24px;
  border-radius: 12px;
  font-weight: 500;
  transition: all 0.3s;
  cursor: pointer;
  box-shadow: ${props => props.active ? '0 4px 12px rgba(0,0,0,0.2)' : 'none'};
  &:hover {
    color: white;
  }
`;

function Login() {
  const { loginWithRedirect } = useAuth0();
  const navigate = useNavigate();
  const [role, setRole] = useState('admin');

  function handleLogin() {
    if (role === 'admin') {
      const email = document.getElementById('formControlLgEmail')?.value || '';
      const password = document.getElementById('formControlLgPass')?.value || '';
      if (email !== '' && password !== '') {
        navigate('/admin');
      }
    } else {
      loginWithRedirect();
    }
  }

  return (
    <div className="auth-bg">
      <MDBContainer className="auth-card">
        <GlassPane>
          <MDBRow className="w-100 g-0">
            {/* Left Branding Panel */}
            <MDBCol md="5" className="d-none d-md-flex" style={{
              background: 'linear-gradient(135deg, rgba(116, 81, 248, 0.2) 0%, rgba(255, 105, 15, 0.2) 100%)',
              borderRight: '1px solid rgba(255,255,255,0.05)',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'relative', zIndex: 2, padding: '3rem', textAlign: 'center' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  height: '80px', width: '80px',
                  borderRadius: '24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 2rem',
                  boxShadow: '0 8px 32px rgba(116, 81, 248, 0.3)'
                }}>
                  <AirplaneTicketIcon style={{ height: "40px", width: "40px", color: "var(--color-white)" }} />
                </div>
                <h1 className="fw-bold mb-3" style={{ fontSize: '32px', letterSpacing: '-1px', color: 'var(--color-white)' }}>
                  Where <span className="text-gradient">dreams</span> take flight
                </h1>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px', lineHeight: '1.6' }}>
                  Experience seamless booking and manage your journey with unparalleled elegance.
                </p>
              </div>
            </MDBCol>

            {/* Right Login Panel */}
            <MDBCol md="7">
              <ContentCol>
                <FormContainer>
                  <h2 className="fw-bold mb-4" style={{ fontSize: '28px' }}>Welcome back</h2>
                  
                  <RoleToggleContainer>
                    <RoleBtn active={role === 'admin'} onClick={() => setRole('admin')}>
                      Administrator
                    </RoleBtn>
                    <RoleBtn active={role === 'user'} onClick={() => {
                      setRole('user');
                      loginWithRedirect();
                    }}>
                      Traveler
                    </RoleBtn>
                  </RoleToggleContainer>

                  {role === 'admin' && (
                    <div style={{ display: "flex", flex: 1, flexDirection: 'column' }}>
                      <CustomInput>
                        <MDBInput label='Email address' id='formControlLgEmail' type='email' size="lg" 
                          contrast className="custom-mdb-input" />
                      </CustomInput>
                      <CustomInput>
                        <MDBInput label='Password' id='formControlLgPass' type='password' size="lg" contrast />
                      </CustomInput>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                        <Button gradient onClick={handleLogin} style={{ margin: 0 }}>
                          Sign In as Admin
                        </Button>
                        <a href="/forgot-password" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                          Forgot password?
                        </a>
                      </div>

                      <div className='d-flex flex-row mt-5 pt-3 border-top border-secondary'>
                        <a href="/terms" style={{ color: 'var(--color-gray)', textDecoration: 'none', fontSize: '13px', marginRight: '16px' }}>Terms of use</a>
                        <a href="/privacy" style={{ color: 'var(--color-gray)', textDecoration: 'none', fontSize: '13px' }}>Privacy policy</a>
                      </div>
                    </div>
                  )}
                </FormContainer>
              </ContentCol>
            </MDBCol>
          </MDBRow>
        </GlassPane>
      </MDBContainer>
    </div>
  );
}

// Styled component for Button (since MDBBtn can have overriding styles)
const Button = styled.button`
  background: ${props => props.gradient ? 'linear-gradient(135deg, #7451f8 0%, #ff690f 100%)' : 'rgba(255,255,255,0.1)'};
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
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(116, 81, 248, 0.5);
  }
`;

export default Login;