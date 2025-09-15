import React from 'react';
import { LoginForm } from '../components/Auth/LoginForm';

export const AdminLoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-default-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <img
              src="/FIT4U copy.png"
              alt="FIT4U"
              className="w-16 h-16 rounded-full mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-default-text">管理者ログイン</h1>
            <p className="text-secondary mt-2 text-sm">このページは管理者専用です</p>
          </div>
          <LoginForm onToggleMode={() => {}} />
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;

