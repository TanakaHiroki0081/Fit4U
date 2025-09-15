import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CreditCard, Building, User, Save, Edit, AlertCircle, CheckCircle, Search } from 'lucide-react';
import { financialInstitutions, getInstitutionsByCategory, searchInstitutions, getInstitutionByName } from '../data/financialInstitutions';

interface BankAccount {
  id?: string;
  trainer_id: string;
  bank_name: string;
  branch_code: string;
  account_type: 'savings' | 'checking';
  account_number: string;
  account_holder_name: string;
  account_holder_kana: string;
  is_verified: boolean;
  created_at?: string;
  updated_at?: string;
}

export const BankAccountPage: React.FC = () => {
  const { user } = useAuth();
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [formData, setFormData] = useState<Partial<BankAccount>>({
    bank_name: '',
    branch_code: '',
    account_type: 'savings',
    account_number: '',
    account_holder_name: '',
    account_holder_kana: ''
  });

  const institutionsByCategory = getInstitutionsByCategory();
  const categories = Object.keys(institutionsByCategory);

  useEffect(() => {
    if (user?.role === 'trainer') {
      fetchBankAccount();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchBankAccount = async () => {
    try {
      const { data, error } = await supabase
        .from('trainer_bank_accounts')
        .select('*')
        .eq('trainer_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setBankAccount(data);
        setFormData(data);
      } else {
        setEditing(true);
      }
    } catch (error) {
      console.error('Error fetching bank account:', error);
      setError('振込先情報の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBankSelect = (bankName: string) => {
    setFormData(prev => ({
      ...prev,
      bank_name: bankName
    }));
    setSearchQuery(bankName);
    setShowDropdown(false);
    setSelectedCategory('');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setFormData(prev => ({
      ...prev,
      bank_name: query
    }));
    setShowDropdown(query.length > 0);
  };

  const validateForm = () => {
    // 金融機関名の検証
    if (!formData.bank_name?.trim()) {
      setError('金融機関名を選択してください。');
      return false;
    }

    const institution = getInstitutionByName(formData.bank_name);
    if (!institution) {
      setError('選択された金融機関は対応していません。リストから選択してください。');
      return false;
    }

    // ゆうちょ銀行のチェック
    if (formData.bank_name.includes('ゆうちょ')) {
      setError('ゆうちょ銀行への振込は対応していません。');
      return false;
    }

    // 支店コードの検証
    if (!formData.branch_code?.trim()) {
      setError('支店コードを入力してください。');
      return false;
    }
    if (!/^\d{4}$/.test(formData.branch_code)) {
      setError('支店コードは4桁の数字で入力してください。');
      return false;
    }

    if (!formData.account_number?.trim()) {
      setError('口座番号を入力してください。');
      return false;
    }
    if (!/^\d{7}$/.test(formData.account_number)) {
      setError('口座番号は7桁の数字で入力してください。');
      return false;
    }
    if (!formData.account_holder_name?.trim()) {
      setError('口座名義人を入力してください。');
      return false;
    }
    if (!formData.account_holder_kana?.trim()) {
      setError('口座名義人（カナ）を入力してください。');
      return false;
    }
    // 半角カナと一部記号（英数不可にする）
    if (!/^[ｦ-ﾟ\s\(\)\-｡｢｣､､･]+$/.test(formData.account_holder_kana)) {
      setError('口座名義人（カナ）は半角カナのみで入力してください（英数・全角不可、丸括弧可）。');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const accountData = {
        trainer_id: user?.id,
        bank_name: formData.bank_name?.trim(),
        branch_code: formData.branch_code?.trim(),
        account_type: formData.account_type,
        account_number: formData.account_number?.trim(),
        account_holder_name: formData.account_holder_name?.trim(),
        account_holder_kana: formData.account_holder_kana?.trim(),
        is_verified: false
      };

      if (bankAccount?.id) {
        // Update existing account
        const { error } = await supabase
          .from('trainer_bank_accounts')
          .update({
            ...accountData,
            updated_at: new Date().toISOString()
          })
          .eq('id', bankAccount.id);

        if (error) throw error;
        setSuccess('振込先情報を更新しました。');
      } else {
        // Create new account
        const { data, error } = await supabase
          .from('trainer_bank_accounts')
          .insert([accountData])
          .select()
          .single();

        if (error) throw error;
        setBankAccount(data);
        setSuccess('振込先情報を登録しました。');
      }

      await fetchBankAccount();
      setEditing(false);
    } catch (error) {
      console.error('Error saving bank account:', error);
      setError('振込先情報の保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (bankAccount) {
      setFormData(bankAccount);
      setSearchQuery(bankAccount.bank_name);
    } else {
      setFormData({
        bank_name: '',
        branch_code: '',
        account_type: 'savings',
        account_number: '',
        account_holder_name: '',
        account_holder_kana: ''
      });
      setSearchQuery('');
    }
    setEditing(false);
    setError('');
    setSuccess('');
    setShowDropdown(false);
    setSelectedCategory('');
  };

  const filteredInstitutions = searchQuery 
    ? searchInstitutions(searchQuery).slice(0, 10)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user?.role !== 'trainer') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-default-text mb-4">アクセス拒否</h1>
        <p className="text-secondary">この機能はトレーナーのみ利用可能です。</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-default-text">振込先口座情報</h1>
          </div>
          {bankAccount && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              <Edit size={16} />
              <span>編集</span>
            </button>
          )}
        </div>

        {/* Status Alert */}
        {bankAccount && (
          <div className={`rounded-md p-4 mb-6 ${
            bankAccount.is_verified 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center space-x-2">
              {bankAccount.is_verified ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              )}
              <p className={`text-sm font-medium ${
                bankAccount.is_verified ? 'text-green-800' : 'text-yellow-800'
              }`}>
                {bankAccount.is_verified 
                  ? '口座情報が確認済みです' 
                  : '口座情報の確認中です（1-2営業日程度）'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Financial Institution Name */}
          <div className="relative">
            <label htmlFor="bank_name" className="block text-sm font-medium text-default-text mb-1">
              <Building className="inline w-4 h-4 mr-1" />
              金融機関名 *
            </label>
            {editing ? (
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    id="bank_name"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="金融機関名を入力または選択してください"
                    className="w-full px-3 py-2 pr-10 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary" size={16} />
                </div>

                {/* Category Selection */}
                {showDropdown && !searchQuery && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-secondary/30 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 border-b">
                      <p className="text-sm font-medium text-default-text mb-2">カテゴリから選択</p>
                      {categories.map(category => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setSelectedCategory(category)}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Institution List by Category */}
                {showDropdown && selectedCategory && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-secondary/30 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 border-b">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('')}
                        className="text-sm text-primary hover:text-primary/80"
                      >
                        ← カテゴリ選択に戻る
                      </button>
                    </div>
                    {institutionsByCategory[selectedCategory]?.map(institution => (
                      <button
                        key={institution.code}
                        type="button"
                        onClick={() => handleBankSelect(institution.name)}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                      >
                        {institution.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Search Results */}
                {showDropdown && searchQuery && filteredInstitutions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-secondary/30 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredInstitutions.map(institution => (
                      <button
                        key={institution.code}
                        type="button"
                        onClick={() => handleBankSelect(institution.name)}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                      >
                        <div>
                          <div className="font-medium">{institution.name}</div>
                          <div className="text-xs text-secondary">{institution.category}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No Results */}
                {showDropdown && searchQuery && filteredInstitutions.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-secondary/30 rounded-md shadow-lg p-3">
                    <p className="text-sm text-secondary">該当する金融機関が見つかりません</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-default-text py-2">{bankAccount?.bank_name || '未設定'}</p>
            )}
          </div>

          {/* Branch Code */}
          <div>
            <label htmlFor="branch_code" className="block text-sm font-medium text-default-text mb-1">
              支店コード（4桁） *
            </label>
            {editing ? (
              <input
                type="text"
                id="branch_code"
                name="branch_code"
                value={formData.branch_code || ''}
                onChange={handleChange}
                placeholder="0001"
                maxLength={4}
                pattern="\d{4}"
                className="w-full px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            ) : (
              <p className="text-default-text py-2">{bankAccount?.branch_code || '未設定'}</p>
            )}
          </div>

          {/* Account Type */}
          <div>
            <label htmlFor="account_type" className="block text-sm font-medium text-default-text mb-1">
              口座種別 *
            </label>
            {editing ? (
              <select
                id="account_type"
                name="account_type"
                value={formData.account_type || 'savings'}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="savings">普通預金</option>
                <option value="checking">当座預金</option>
              </select>
            ) : (
              <p className="text-default-text py-2">
                {bankAccount?.account_type === 'savings' ? '普通預金' : '当座預金'}
              </p>
            )}
          </div>

          {/* Account Number */}
          <div>
            <label htmlFor="account_number" className="block text-sm font-medium text-default-text mb-1">
              口座番号 *
            </label>
            {editing ? (
              <input
                type="text"
                id="account_number"
                name="account_number"
                value={formData.account_number || ''}
                onChange={handleChange}
                placeholder="1234567（7桁の数字）"
                maxLength={7}
                pattern="\d{7}"
                className="w-full px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            ) : (
              <p className="text-default-text py-2">
                {bankAccount?.account_number ? `****${bankAccount.account_number.slice(-3)}` : '未設定'}
              </p>
            )}
          </div>

          {/* Account Holder Name */}
          <div>
            <label htmlFor="account_holder_name" className="block text-sm font-medium text-default-text mb-1">
              <User className="inline w-4 h-4 mr-1" />
              口座名義人 *
            </label>
            {editing ? (
              <input
                type="text"
                id="account_holder_name"
                name="account_holder_name"
                value={formData.account_holder_name || ''}
                onChange={handleChange}
                placeholder="例：山田太郎"
                className="w-full px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            ) : (
              <p className="text-default-text py-2">{bankAccount?.account_holder_name || '未設定'}</p>
            )}
          </div>

          {/* Account Holder Kana */}
          <div>
            <label htmlFor="account_holder_kana" className="block text-sm font-medium text-default-text mb-1">
              口座名義人（カナ） *
            </label>
            {editing ? (
              <input
                type="text"
                id="account_holder_kana"
                name="account_holder_kana"
                value={formData.account_holder_kana || ''}
                onChange={handleChange}
                placeholder="例：ヤマダタロウ"
                className="w-full px-3 py-2 border border-secondary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            ) : (
              <p className="text-default-text py-2">{bankAccount?.account_holder_kana || '未設定'}</p>
            )}
            {editing && (
              <p className="text-xs text-secondary mt-1">
                半角カタカナ・半角文字で入力してください
              </p>
            )}
          </div>

          {/* Action Buttons */}
          {editing && (
            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-secondary/30 text-secondary rounded-md hover:bg-secondary/10 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center space-x-2 bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                <span>{saving ? '保存中...' : '保存'}</span>
              </button>
            </div>
          )}
        </form>

        {/* Important Notes */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="font-medium text-blue-800 mb-2">重要事項</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 振込先口座は正確にご記載ください</li>
            <li>• 振込先口座の確認には1-2営業日程度かかります</li>
            <li>• 売上の振込は月末締めで翌10営業日目より申請可能です</li>
            <li>• <strong>ゆうちょ銀行への振込は対応していません</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
};