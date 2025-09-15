import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Lesson, User } from '../types';
import { ArrowLeft, Users, Mail, Calendar, Clock, MapPin, Monitor } from 'lucide-react';
import { User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export const LessonParticipantsPage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (lessonId) {
      fetchLessonAndParticipants();
    }
  }, [lessonId]);

  const fetchLessonAndParticipants = async () => {
    try {
      // Fetch lesson details
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .eq('trainer_id', user?.id) // Ensure trainer can only see their own lessons
        .single();

      if (lessonError) throw lessonError;
      setLesson(lessonData);

      // Fetch participants
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          client:users!bookings_client_id_fkey(id, name, email, avatar_url, bio, created_at)
        `)
        .eq('lesson_id', lessonId)
        .eq('status', 'confirmed')
        .not('client', 'is', null);

      if (bookingsError) throw bookingsError;
      
      const participantsList = bookingsData?.map(booking => booking.client).filter(Boolean) || [];
      setParticipants(participantsList);

    } catch (error) {
      console.error('Error fetching lesson participants:', error);
      setError('参加者情報の取得に失敗しました。');
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

  if (!lesson) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <h1 className="text-2xl font-bold text-default-text mb-4">レッスンが見つかりません</h1>
        <button
          onClick={() => navigate('/bookings')}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
        >
          予約管理に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/bookings')}
        className="inline-flex items-center space-x-2 text-secondary hover:text-primary"
      >
        <ArrowLeft size={20} />
        <span>予約管理に戻る</span>
      </button>

      {/* Lesson Info */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-default-text mb-4">{lesson.title}</h1>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm text-secondary">
          <div className="flex items-center space-x-2">
            <Calendar size={16} />
            <span>
              {format(new Date(lesson.date), 'M月d日(E)', { locale: ja })}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock size={16} />
            <span>{lesson.time} ({lesson.duration}分)</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users size={16} />
            <span>最大{lesson.max_participants}名</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin size={16} />
            <span>{lesson.location}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Participants List */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-default-text">
            参加者一覧 ({participants.length}名)
          </h2>
          <div className="text-sm text-secondary">
            予約状況: {participants.length}/{lesson.max_participants}名
          </div>
        </div>

        {participants.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-secondary mx-auto mb-4" />
            <p className="text-secondary">まだ参加者はいません</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="border border-secondary/20 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                    {participant.avatar_url ? (
                      <img
                        src={participant.avatar_url}
                        alt={participant.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-primary" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <Link
                        to={`/participant/${participant.id}`}
                        className="text-lg font-semibold text-default-text hover:text-primary"
                      >
                        {participant.name}
                      </Link>
                      <span className="text-sm text-secondary">
                        登録日: {format(new Date(participant.created_at), 'yyyy年M月', { locale: ja })}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-secondary mb-2">
                      <Mail size={14} />
                      <span>{participant.email}</span>
                    </div>

                    {participant.bio && (
                      <p className="text-secondary text-sm line-clamp-2">{participant.bio}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};