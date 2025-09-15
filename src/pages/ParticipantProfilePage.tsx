import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { ArrowLeft, Mail, Calendar, MessageSquare } from 'lucide-react';
import { User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export const ParticipantProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [participant, setParticipant] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchParticipant();
    }
  }, [id]);

  const fetchParticipant = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .eq('role', 'client')
        .single();

      if (error) throw error;
      setParticipant(data);
    } catch (error) {
      console.error('Error fetching participant:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <h1 className="text-2xl font-bold text-default-text mb-4">参加者が見つかりません</h1>
        <button
          onClick={() => navigate(-1)}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
        >
          戻る
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center space-x-2 text-secondary hover:text-primary"
      >
        <ArrowLeft size={20} />
        <span>戻る</span>
      </button>

      {/* Participant Profile */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start space-x-6 mb-6">
          <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0">
            {participant.avatar_url ? (
              <img
                src={participant.avatar_url}
                alt={participant.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="w-10 h-10 text-primary" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-default-text mb-2">{participant.name}</h1>
            
            <div className="space-y-2 text-sm text-secondary">
              <div className="flex items-center space-x-2">
                <Mail size={14} />
                <span>{participant.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar size={14} />
                <span>登録日: {format(new Date(participant.created_at), 'yyyy年M月d日', { locale: ja })}</span>
              </div>
            </div>
          </div>
        </div>

        {participant.bio && (
          <div>
            <h3 className="flex items-center space-x-2 font-semibold text-default-text mb-3">
              <MessageSquare className="w-5 h-5" />
              <span>自己紹介</span>
            </h3>
            <p className="text-secondary leading-relaxed whitespace-pre-wrap">{participant.bio}</p>
          </div>
        )}

        {!participant.bio && (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-secondary mx-auto mb-4" />
            <p className="text-secondary">自己紹介が設定されていません</p>
          </div>
        )}
      </div>
    </div>
  );
};