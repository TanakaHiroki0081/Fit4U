import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Notification } from '../types';
import { Bell, X } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false);

      if (error) throw error;
      
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-secondary hover:text-default-text"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-secondary/20 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-secondary/20">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-default-text">お知らせ</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={loading}
                    className="text-xs text-primary hover:text-primary/80 disabled:opacity-50"
                  >
                    すべて既読
                  </button>
                )}
                <button
                  onClick={() => setShowDropdown(false)}
                  className="text-secondary hover:text-default-text"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-secondary">
                お知らせはありません
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-secondary/10 hover:bg-gray-50 cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-default-text text-sm">
                      {notification.title}
                    </h4>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1"></div>
                    )}
                  </div>
                  <p className="text-secondary text-sm mb-2 leading-relaxed">
                    {notification.message}
                  </p>
                  <p className="text-xs text-secondary">
                    {format(new Date(notification.created_at), 'M月d日 HH:mm', { locale: ja })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};