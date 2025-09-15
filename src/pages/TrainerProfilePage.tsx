import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Lesson } from '../types';
import { Star, Calendar, Clock, Users, MapPin, Monitor, Award, MessageSquare, ArrowLeft, FileText } from 'lucide-react';
import { User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export const TrainerProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [trainer, setTrainer] = useState<User | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'lessons' | 'reviews'>('lessons');

  useEffect(() => {
    if (id) {
      fetchTrainerData();
    }
  }, [id]);

  const fetchTrainerData = async () => {
    try {
      console.log('Fetching trainer data for ID:', id);
      // Fetch trainer profile
      const { data: trainerData, error: trainerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .eq('role', 'trainer')
        .single();

      if (trainerError) throw trainerError;
      console.log('Trainer data:', trainerData);
      setTrainer(trainerData);

      // Fetch trainer's lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('trainer_id', id)
        .eq('status', 'scheduled')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(10);

      if (lessonsError) throw lessonsError;
      console.log('Lessons data:', lessonsData);
      setLessons(lessonsData || []);

      // Fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          *,
          lesson:lessons(title, date, time),
          client:users!reviews_trainee_id_fkey(name)
        `)
        .eq('trainer_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (reviewsError) throw reviewsError;
      console.log('Reviews data:', reviewsData);
      setReviews(reviewsData || []);
      setTotalReviews(reviewsData?.length || 0);
      
      if (reviewsData && reviewsData.length > 0) {
        const avgRating = reviewsData.reduce((sum, review) => sum + review.rating, 0) / reviewsData.length;
        console.log('Calculated average rating:', avgRating);
        setAverageRating(avgRating);
      }
    } catch (error) {
      console.error('Error fetching trainer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      yoga: 'ヨガ系',
      pilates: 'ピラティス系',
      stretch: 'ストレッチ系',
      strength: '筋トレ系',
      dance: 'ダンス系',
      boxing: 'ボクシング系',
      hiit: 'HIIT系',
      other: 'その他'
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      yoga: 'bg-purple-100 text-purple-800',
      pilates: 'bg-green-100 text-green-800',
      stretch: 'bg-blue-100 text-blue-800',
      strength: 'bg-red-100 text-red-800',
      dance: 'bg-pink-100 text-pink-800',
      boxing: 'bg-orange-100 text-orange-800',
      hiit: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <h1 className="text-2xl font-bold text-default-text mb-4">トレーナーが見つかりません</h1>
        <Link
          to="/lessons"
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
        >
          レッスン一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Link
        to="/lessons"
        className="inline-flex items-center space-x-2 text-secondary hover:text-primary"
      >
        <ArrowLeft size={20} />
        <span>レッスン一覧に戻る</span>
      </Link>

      {/* Trainer Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start space-x-6">
          <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0">
            {trainer.avatar_url ? (
              <img
                src={trainer.avatar_url}
                alt={trainer.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="w-12 h-12 text-primary" />
              </div>
            )}
          </div>
          
          {trainer.identity_verified && (
            <div className="flex items-center space-x-1 mb-3">
              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm text-green-600 font-medium">本人確認済み</span>
            </div>
          )}
          
          <div className="flex-1">
            <h1 className="text-xl font-bold text-default-text mb-2">{trainer.name}</h1>
            
            {trainer.identity_verified && (
              <div className="flex items-center space-x-1 mb-3">
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-green-600 font-medium">本人確認済み</span>
              </div>
            )}
            
            {totalReviews > 0 && (
              <div className="flex items-center space-x-2 mb-2">
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium">
                    {averageRating.toFixed(1)} ({totalReviews}件のレビュー)
                  </span>
                </div>
              </div>
            )}
            
            {trainer.specialties && trainer.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {trainer.specialties.map((specialty, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bio Section */}
      {trainer.bio && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-default-text mb-3">自己紹介</h3>
          <p className="text-secondary leading-relaxed">{trainer.bio}</p>
        </div>
      )}

      {/* Additional Info */}
      {(trainer.experience || trainer.qualifications) && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trainer.experience && (
              <div>
                <h3 className="flex items-center space-x-2 font-semibold text-default-text mb-2">
                  <Award className="w-5 h-5" />
                  <span>経歴・実績</span>
                </h3>
                <p className="text-secondary whitespace-pre-wrap">{trainer.experience}</p>
              </div>
            )}

            {trainer.qualifications && (
              <div>
                <h3 className="flex items-center space-x-2 font-semibold text-default-text mb-2">
                  <Award className="w-5 h-5" />
                  <span>保有資格</span>
                </h3>
                <p className="text-secondary whitespace-pre-wrap">{trainer.qualifications}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div id="reviews" className="bg-white rounded-lg shadow-sm">
        <div className="flex border-b border-secondary/20">
          <button
            onClick={() => setActiveTab('lessons')}
            className={`flex-1 py-3 px-4 text-center font-medium ${
              activeTab === 'lessons'
                ? 'text-primary border-b-2 border-primary'
                : 'text-secondary hover:text-default-text'
            }`}
          >
            レッスン一覧 ({lessons.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex-1 py-3 px-4 text-center font-medium ${
              activeTab === 'reviews'
                ? 'text-primary border-b-2 border-primary'
                : 'text-secondary hover:text-default-text'
            }`}
          >
            レビュー ({totalReviews})
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'lessons' ? (
            <div className="space-y-4">
              {lessons.length === 0 ? (
                <p className="text-center text-secondary py-8">
                  現在開催予定のレッスンはありません
                </p>
              ) : (
                lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="border border-secondary/20 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-default-text">{lesson.title}</h3>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getCategoryColor(lesson.category)}`}>
                          {getCategoryLabel(lesson.category)}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-primary">
                        ¥{lesson.price.toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm text-secondary">
                      <div className="flex items-center space-x-1">
                        <Calendar size={14} />
                        <span>
                          {format(new Date(lesson.date), 'M月d日(E)', { locale: ja })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock size={14} />
                        <span>{lesson.time} ({lesson.duration}分)</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users size={14} />
                        <span>最大{lesson.max_participants}名</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin size={14} />
                        <span>{lesson.location}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-secondary text-sm line-clamp-2">{lesson.description}</p>
                      <Link
                        to={`/lessons/${lesson.id}`}
                        className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary/90 transition-colors ml-4"
                      >
                        詳細・予約
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-center text-secondary py-8">
                  まだレビューはありません
                </p>
              ) : (
                reviews.map((review) => (
                  <div
                    key={review.id}
                    className="border border-secondary/20 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                          {review.trainee?.name || 'ユーザー'}
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                        <p className="text-xs text-secondary">
                          {review.lesson?.title}
                        </p>
                            <UserIcon className="w-6 h-6 text-primary" />
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-default-text">
                            {review.client?.name || 'ユーザー'}
                          </p>
                          <div className="flex items-center space-x-1">
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                          </div>
                          </div>
                      </div>
                      <span className="text-sm text-secondary">
                        {format(new Date(review.created_at), 'yyyy年M月d日', { locale: ja })}
                      </span>
                    </div>
                    <p className="text-secondary leading-relaxed">{review.comment}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};