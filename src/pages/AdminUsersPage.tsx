import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { Users, Trash2, AlertCircle, Shield, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export const AdminUsersPage: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'admin' | 'trainer' | 'client'>('all');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users as admin:', user?.email);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Users fetch result:', { data, error });
      console.log('Total users fetched:', data?.length);
      console.log('Users by role:', {
        admin: data?.filter(u => u.role === 'admin').length,
        trainer: data?.filter(u => u.role === 'trainer').length,
        client: data?.filter(u => u.role === 'client').length
      });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('ユーザー一覧の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const checkUserDeletability = async (userId: string, userRole: string) => {
    try {
      // Check if user has any pending payouts
      const { data: payoutRequests } = await supabase
        .from('payout_requests')
        .select('net_payout')
        .eq('trainer_id', userId)
        .neq('status', 'paid');

      const pendingPayouts = payoutRequests?.reduce((sum, p) => sum + p.net_payout, 0) || 0;

      // Check if user has any sales (as trainer)
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, lesson:lessons!inner(trainer_id)')
        .eq('lesson.trainer_id', userId);

      const totalSales = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

      // Check if user has any bookings (as client or trainer)
      const { data: clientBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('client_id', userId);

      const { data: trainerBookings } = await supabase
        .from('bookings')
        .select('id, lesson:lessons!inner(trainer_id)')
        .eq('lesson.trainer_id', userId);

      const totalBookings = (clientBookings?.length || 0) + (trainerBookings?.length || 0);

      return {
        canDelete: pendingPayouts === 0 && totalSales === 0 && totalBookings === 0,
        reasons: {
          pendingPayouts,
          totalSales,
          totalBookings
        }
      };
    } catch (error) {
      console.error('Error checking user deletability:', error);
      return { canDelete: false, reasons: { pendingPayouts: 0, totalSales: 0, totalBookings: 0 } };
    }
  };

  const handleDeleteUser = async (userId: string, userName: string, userRole: string) => {
    if (!confirm(`${userName}さんを削除しますか？この操作は取り消せません。`)) {
      return;
    }

    setDeleting(userId);
    setError('');

    try {
      // Check if user can be deleted
      const { canDelete, reasons } = await checkUserDeletability(userId, userRole);

      if (!canDelete) {
        const errorMessages = [];
        if (reasons.pendingPayouts > 0) {
          errorMessages.push(`振込可能金額: ¥${reasons.pendingPayouts.toLocaleString()}`);
        }
        if (reasons.totalSales > 0) {
          errorMessages.push(`売上金額: ¥${reasons.totalSales.toLocaleString()}`);
        }
        if (reasons.totalBookings > 0) {
          errorMessages.push(`予約件数: ${reasons.totalBookings}件`);
        }

        setError(`削除できません。以下の条件を満たしていません:\n${errorMessages.join('\n')}`);
        return;
      }

      // Delete user
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      await fetchUsers();
      alert(`${userName}さんを削除しました。`);
    } catch (error: any) {
      setError(`削除に失敗しました: ${error.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      trainer: 'bg-blue-100 text-blue-800',
      client: 'bg-green-100 text-green-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: '管理者',
      trainer: 'トレーナー',
      client: '参加者'
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'trainer':
        return <UserCheck className="w-4 h-4" />;
      case 'client':
        return <Users className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-default-text mb-4">アクセス拒否</h1>
        <p className="text-secondary">この機能は管理者のみ利用可能です。現在のロール: {user?.role || 'なし'}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => filter === 'all' || u.role === filter);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-default-text">ユーザー管理</h1>
          
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">すべてのユーザー</option>
            <option value="admin">管理者</option>
            <option value="trainer">トレーナー</option>
            <option value="client">参加者</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-800">総ユーザー</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {users.length}
            </p>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800">管理者</span>
            </div>
            <p className="text-2xl font-bold text-red-800 mt-2">
              {users.filter(u => u.role === 'admin').length}
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">トレーナー</span>
            </div>
            <p className="text-2xl font-bold text-blue-800 mt-2">
              {users.filter(u => u.role === 'trainer').length}
            </p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">参加者</span>
            </div>
            <p className="text-2xl font-bold text-green-800 mt-2">
              {users.filter(u => u.role === 'client').length}
            </p>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Users className="w-12 h-12 text-secondary mx-auto mb-4" />
            <p className="text-secondary">ユーザーが見つかりません</p>
          </div>
        ) : (
          filteredUsers.map((userData) => (
            <div
              key={userData.id}
              className="bg-white rounded-lg shadow-sm border border-secondary/20 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                    {userData.avatar_url ? (
                      <img
                        src={userData.avatar_url}
                        alt={userData.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-default-text mb-1">
                      {userData.name}
                    </h3>
                    <p className="text-secondary text-sm mb-2">{userData.email}</p>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getRoleColor(userData.role)}`}>
                        {getRoleIcon(userData.role)}
                        <span>{getRoleLabel(userData.role)}</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-secondary">
                    登録日: {format(new Date(userData.created_at), 'M月d日', { locale: ja })}
                  </span>
                  {userData.role !== 'admin' && (
                    <button
                      onClick={() => handleDeleteUser(userData.id, userData.name, userData.role)}
                      disabled={deleting === userData.id}
                      className="inline-flex items-center space-x-1 bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      <Trash2 size={14} />
                      <span>{deleting === userData.id ? '削除中...' : '削除'}</span>
                    </button>
                  )}
                </div>
              </div>

              {userData.bio && (
                <div className="bg-gray-50 rounded-md p-3 mb-4">
                  <p className="text-sm text-secondary">
                    <strong>自己紹介:</strong> {userData.bio}
                  </p>
                </div>
              )}

              {userData.role === 'trainer' && userData.specialties && userData.specialties.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {userData.specialties.map((specialty, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};