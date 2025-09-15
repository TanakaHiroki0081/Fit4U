import React, { useState } from 'react';
import { LoginForm } from '../components/Auth/LoginForm';
import { SignupForm } from '../components/Auth/SignupForm';
import { ProfileSetupForm } from '../components/Auth/ProfileSetupForm';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Star, Users, Dumbbell, Search, Calendar, MapPin, Target, User } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const navigate = useNavigate();

  const handleSignupComplete = () => {
    setShowProfileSetup(true);
  };

  const handleProfileSetupComplete = () => {
    navigate('/');
  };

  const handleGetStarted = () => {
    setShowLandingPage(false);
  };

  // 架空のトレーナー情報
  const popularTrainers = [
    {
      name: '田中 美咲',
      category: 'ヨガ系',
      price: 2500,
      rating: 4.8,
      reviewCount: 9,
      experience: 8,
      location: '東京都渋谷区',
      image: 'https://images.pexels.com/photos/3822625/pexels-photo-3822625.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=2'
    },
    {
      name: '佐藤 健太',
      category: '筋トレ系',
      price: 4000,
      rating: 4.9,
      reviewCount: 29,
      experience: 6,
      location: '東京都新宿区',
      image: 'https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=2'
    },
    {
      name: '山田 愛子',
      category: 'ピラティス系',
      price: 3000,
      rating: 4.7,
      reviewCount: 7,
      experience: 10,
      location: '東京都港区',
      image: 'https://images.pexels.com/photos/4056535/pexels-photo-4056535.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=2'
    },
    {
      name: '鈴木 大輔',
      category: 'HIIT系',
      price: 2000,
      rating: 4.6,
      reviewCount: 11,
      experience: 5,
      location: '東京都品川区',
      image: 'https://images.pexels.com/photos/4167788/pexels-photo-4167788.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=2'
    },
    {
      name: '高橋 麻衣',
      category: 'ダンス系',
      price: 2000,
      rating: 4.9,
      reviewCount: 8,
      experience: 7,
      location: '東京都世田谷区',
      image: 'https://images.pexels.com/photos/1674049/pexels-photo-1674049.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=2'
    }
  ];

  if (showProfileSetup) {
    return (
      <div className="min-h-screen bg-default-bg flex items-center justify-center p-4">
        <ProfileSetupForm onComplete={handleProfileSetupComplete} />
      </div>
    );
  }

  if (showLandingPage) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="p-6 bg-white shadow-sm">
          <div className="flex items-center space-x-3">
            <img 
              src="/FIT4U copy.png" 
              alt="FIT4U" 
              className="w-12 h-12 rounded-xl shadow-lg"
            />
            <span className="text-2xl font-bold text-default-text tracking-wide">FIT4U</span>
          </div>
        </header>

        {/* Hero Section */}
        <section className="px-6 py-16 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-default-text mb-6 leading-tight">
              ジム契約不要。<br />
              どこでも好きな時間に、<br />
              <span className="text-primary">好きなトレーナーの</span><br />
              レッスンを予約できる
            </h1>
            
            <p className="text-xl md:text-2xl text-secondary font-medium mb-12 max-w-4xl mx-auto">
              FIT4Uは日本初のフィットネスレッスン・マッチングプラットフォーム。<br />
              あなたに最適なトレーナーとレッスンを見つけて、理想の体づくりを始めましょう。
            </p>

            <button
              onClick={handleGetStarted}
              className="inline-flex items-center space-x-3 bg-primary text-white font-bold text-xl px-12 py-6 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 hover:bg-primary/90"
            >
              <span>今すぐ始めてみる</span>
              <ChevronRight className="w-6 h-6" />
            </button>
            
            <p className="text-secondary text-sm mt-6">
              無料でアカウント作成
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-6 py-16 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-8 bg-blue-50 rounded-2xl hover:shadow-lg transition-all duration-300">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-default-text mb-2">簡単検索</h3>
                <p className="text-secondary">条件を指定して理想のトレーナーを簡単に見つけられます</p>
              </div>
              
              <div className="text-center p-8 bg-yellow-50 rounded-2xl hover:shadow-lg transition-all duration-300">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-xl font-bold text-default-text mb-2">評価システム</h3>
                <p className="text-secondary">実際の利用者による評価で安心してトレーナーを選択</p>
              </div>
              
              <div className="text-center p-8 bg-green-50 rounded-2xl hover:shadow-lg transition-all duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-default-text mb-2">即時予約</h3>
                <p className="text-secondary">24時間いつでもオンラインで予約・決済が完了</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why FIT4U Section */}
        <section className="px-6 py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-default-text mb-4">
                なぜFIT4Uなのか？
              </h2>
              <p className="text-xl text-secondary max-w-4xl mx-auto">
                従来のジム選びとは全く違う、幅広い選択肢の中から、あなたに合ったフィットネス体験をお届けします。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <User className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-default-text mb-3">トレーナー重視の検索</h3>
                <p className="text-secondary">あなたに最適なトレーナーの専門性、経歴、レビューから選択</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-default-text mb-3">カテゴリー別でも検索可能</h3>
                <p className="text-secondary">ヨガ、ピラティス、ボクササイズ、HIITなど、あなたの好きな種目に特化したトレーナーが見つかる</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-default-text mb-3">柔軟なスケジュール</h3>
                <p className="text-secondary">24時間いつでも予約可能。レッスンの空き状況をリアルタイムで確認</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-default-text mb-3">場所を選ばない</h3>
                <p className="text-secondary">ジム、自宅、お出かけ先など、あなたの都合に合わせた場所でレッスンを選べる</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 md:col-span-2 lg:col-span-1 border-2 border-yellow-200">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <h3 className="text-lg font-bold text-default-text mb-3">透明な評価システム</h3>
                <p className="text-secondary">実際の利用者による評価レビューを可視化。安心してトレーナーを選択できる</p>
              </div>
            </div>
          </div>
        </section>

        {/* Steps Section */}
        <section className="px-6 py-16 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-default-text mb-4">
                簡単3ステップで始められます
              </h2>
              <p className="text-xl text-secondary">
                面倒な手続きは一切なし。今すぐあなただけのフィットネス体験を始めましょう
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex items-start space-x-6 p-8 bg-blue-50 rounded-2xl">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xl">01</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-default-text mb-2">理想のトレーナーやカテゴリー別でレッスンを検索</h3>
                  <p className="text-secondary">条件で絞り込み</p>
                </div>
              </div>

              <div className="flex items-start space-x-6 p-8 bg-green-50 rounded-2xl">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xl">02</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-default-text mb-2">レッスン内容やトレーナーのプロフィールを確認</h3>
                  <p className="text-secondary">レッスン内容・経歴・専門性・レビューをチェック</p>
                </div>
              </div>

              <div className="flex items-start space-x-6 p-8 bg-yellow-50 rounded-2xl">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xl">03</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-default-text mb-2">予約・セッション開始</h3>
                  <p className="text-secondary">日時を選んで、あとは当日参加するだけ</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Popular Trainers Section */}
        <section className="px-6 py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-default-text mb-4">
                人気のトレーナーをご紹介
              </h2>
              <p className="text-xl text-secondary">
                各分野のエキスパートトレーナーが、あなたの目標達成をサポートします。
              </p>
            </div>

            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex space-x-6 pb-4" style={{ width: 'max-content' }}>
                {popularTrainers.map((trainer, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-80 bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={trainer.image}
                        alt={trainer.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-4 right-4">
                        <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-primary">
                          {trainer.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold text-default-text text-lg mb-2">{trainer.name}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-secondary">料金</span>
                          <span className="font-bold text-primary">¥{trainer.price.toLocaleString()}/h</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-secondary">評価</span>
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="font-medium">{trainer.rating}</span>
                            <span className="text-secondary">({trainer.reviewCount}件)</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-secondary">経験年数</span>
                          <span className="font-medium">{trainer.experience}年</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-secondary">場所</span>
                          <span className="font-medium">{trainer.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Summary Section */}
        <section className="px-6 py-16 bg-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-default-text mb-4">
              理想の運動習慣に向けて第一歩を今すぐ始めませんか？
            </h2>
            <p className="text-xl text-secondary mb-12">
              あなたに最適なトレーナーとレッスンが、確実に目標達成へと導きます。
            </p>

            <div className="bg-primary/5 rounded-2xl p-8 mb-12">
              <h3 className="text-2xl font-bold text-default-text mb-6">登録は簡単・無料</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-secondary">24時間いつでも予約可能</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-secondary">自分の都合に合った場所のレッスンが見つかる</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-secondary">魅力的なトレーナー多数</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-secondary">カテゴリーから選択可能</span>
                </div>
                <div className="flex items-center space-x-3 md:col-span-2 justify-center">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-secondary">透明な評価システム</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Reasons Section */}
        <section className="px-6 py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-default-text mb-4">
                今すぐ始める3つの理由
              </h2>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-default-text mb-2">ジム契約なしで今日から利用できる</h3>
                    <p className="text-secondary">面倒な契約手続きや月額費用は一切不要。思い立ったその日からスタート</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-default-text mb-2">続けやすい都度払い・1回から参加OK</h3>
                    <p className="text-secondary">無理なく続けられる料金体系。自分のペースで運動習慣を身につけられます</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-default-text mb-2">スマホ1つで完結</h3>
                    <p className="text-secondary">検索から予約、決済まですべてアプリ内で完結。いつでもどこでも簡単操作</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="px-6 py-16 bg-gradient-to-br from-primary to-red-500">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              あなたの理想のフィットネス体験を今すぐ始めよう
            </h2>
            <p className="text-xl text-white/90 mb-12">
              プロトレーナーがあなたをお待ちしています
            </p>

            <button
              onClick={handleGetStarted}
              className="inline-flex items-center space-x-3 bg-white text-primary font-bold text-xl px-12 py-6 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 hover:bg-gray-50"
            >
              <span>今すぐ始めてみる</span>
              <ChevronRight className="w-6 h-6" />
            </button>
            
            <p className="text-white/80 text-sm mt-6">
              無料でアカウント作成
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-default-bg flex items-center justify-center p-4">
      {isLogin ? (
        <LoginForm onToggleMode={() => setIsLogin(false)} />
      ) : (
        <SignupForm 
          onToggleMode={() => setIsLogin(true)} 
          onSignupComplete={handleSignupComplete}
        />
      )}
    </div>
  );
};