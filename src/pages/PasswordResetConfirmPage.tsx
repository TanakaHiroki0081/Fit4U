import React from 'react';
import { PasswordResetConfirmForm } from '../components/Auth/PasswordResetConfirmForm';

export const PasswordResetConfirmPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-default-bg flex items-center justify-center p-4">
      <PasswordResetConfirmForm />
    </div>
  );
};