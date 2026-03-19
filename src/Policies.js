import React from 'react';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';

const PageWrapper = styled.div`
  min-height: 100vh;
  background-color: var(--color-bg-dark-app);
  color: var(--color-white);
  padding: 4rem 2rem;
`;

const ContentCard = styled.div`
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  max-width: 800px;
  margin: 0 auto;
  padding: 4rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);

  h1 {
    font-size: 36px;
    font-weight: 800;
    margin-bottom: 2rem;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  h2 {
    font-size: 24px;
    font-weight: 600;
    margin: 2rem 0 1rem;
    color: var(--color-text-darker);
  }

  p {
    color: var(--color-gray);
    line-height: 1.8;
    margin-bottom: 1.5rem;
  }
`;

const BackBtn = styled.button`
  background: transparent;
  color: var(--color-primary);
  border: none;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  margin-bottom: 2rem;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    text-decoration: underline;
  }
`;

export function Terms() {
  const navigate = useNavigate();
  return (
    <PageWrapper>
      <ContentCard>
        <BackBtn onClick={() => navigate('/')}>&larr; Back to Home</BackBtn>
        <h1>Terms of Use</h1>
        <p>Last updated: October 2023</p>
        
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing and booking flights via Travel-Pro, you accept and agree to be bound by the terms and provisions of this agreement.</p>
        
        <h2>2. Booking and Payments</h2>
        <p>All bookings are final upon successful payment. Prices quoted include applicable taxes unless otherwise noted. We reserve the right to cancel bookings due to system pricing errors or suspected fraud.</p>
        
        <h2>3. Cancellations and Refunds</h2>
        <p>Refunds are subject to individual airline policies. Travel-Pro processing fees are strictly non-refundable under all circumstances.</p>
      </ContentCard>
    </PageWrapper>
  );
}

export function Privacy() {
  const navigate = useNavigate();
  return (
    <PageWrapper>
      <ContentCard>
        <BackBtn onClick={() => navigate('/')}>&larr; Back to Home</BackBtn>
        <h1>Privacy Policy</h1>
        <p>Last updated: October 2023</p>
        
        <h2>1. Information We Collect</h2>
        <p>We collect personal information such as your name, email address, and demographic data when you register as a Traveler or book a flight through Travel-Pro.</p>
        
        <h2>2. How We Use Your Data</h2>
        <p>Your data is exclusively used to process your flight bookings, provide customer support, and enhance your digital experience on our platform using secure encrypted cookies.</p>
        
        <h2>3. Data Sharing</h2>
        <p>We do not sell your personal data. We strictly share necessary flight manifest data with our trusted airline partners to execute your bookings securely.</p>
      </ContentCard>
    </PageWrapper>
  );
}
