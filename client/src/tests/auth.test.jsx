import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import { LanguageProvider } from '../context/LanguageContext.jsx';
import { ToastProvider } from '../components/ui/Toast.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { describe, it, expect } from 'vitest';

describe('Client Auth Pages', () => {
  it('renders login page with profile code and passcode inputs', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <ToastProvider>
                <LoginPage />
              </ToastProvider>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText(/CARE-7F3K/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Passcode/i)).toBeInTheDocument();
  });
});
