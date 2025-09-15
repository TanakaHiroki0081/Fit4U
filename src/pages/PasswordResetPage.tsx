import React from 'react';
import { PasswordResetForm } from '../components/Auth/PasswordResetForm';

export const PasswordResetPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-default-bg flex items-center justify-center p-4">
      <PasswordResetForm />
    </div>
  );
};