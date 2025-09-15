import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { verifyPaymentStatus, getStripeDashboardUrl } from '../api/stripe-utils';

interface PaymentStatusProps {
  sessionId?: string;
  paymentIntentId?: string;
  amount?: number;
  status?: 'pending' | 'paid' | 'failed' | 'refunded';
  showDetails?: boolean;
  onStatusChange?: (status: string) => void;
}

export const PaymentStatus: React.FC<PaymentStatusProps> = ({
  sessionId,
  paymentIntentId,
  amount,
  status: initialStatus,
  showDetails = false,
  onStatusChange
}) => {
  const [status, setStatus] = useState(initialStatus || 'pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionId && !initialStatus) {
      checkPaymentStatus();
    }
  }, [sessionId, initialStatus]);

  const checkPaymentStatus = async () => {
    if (!sessionId) return;

    setLoading(true);
    setError('');

    try {
      const result = await verifyPaymentStatus(sessionId);
      setStatus(result.status);
      if (onStatusChange) {
        onStatusChange(result.status);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = () => {
    switch (status) {
      case 'paid':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          label: '決済完了',
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200'
        };
      case 'failed':
        return {
          icon: <XCircle className="w-5 h-5 text-red-600" />,
          label: '決済失敗',
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200'
        };
      case 'refunded':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
          label: '返金済み',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 border-orange-200'
        };
      default:
        return {
          icon: <Clock className="w-5 h-5 text-yellow-600" />,
          label: '決済処理中',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 border-yellow-200'
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className={`border rounded-lg p-4 ${statusDisplay.bgColor}`}>
      <div className="flex items-center space-x-2 mb-2">
        {loading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
        ) : (
          statusDisplay.icon
        )}
        <span className={`font-medium ${statusDisplay.color}`}>
          {statusDisplay.label}
        </span>
      </div>

      {amount && (
        <p className="text-sm text-secondary mb-2">
          金額: ¥{amount.toLocaleString()}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 mb-2">{error}</p>
      )}

      {showDetails && (
        <div className="space-y-2">
          {sessionId && (
            <p className="text-xs text-secondary">
              セッションID: {sessionId}
            </p>
          )}
          {paymentIntentId && (
            <div className="flex items-center space-x-2">
              <p className="text-xs text-secondary">
                決済ID: {paymentIntentId}
              </p>
              <a
                href={getStripeDashboardUrl(paymentIntentId)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:text-primary/80 flex items-center space-x-1"
              >
                <ExternalLink size={12} />
                <span>Stripe</span>
              </a>
            </div>
          )}
        </div>
      )}

      {sessionId && status === 'pending' && (
        <button
          onClick={checkPaymentStatus}
          disabled={loading}
          className="text-sm text-primary hover:text-primary/80 disabled:opacity-50"
        >
          {loading ? '確認中...' : '状況を確認'}
        </button>
      )}
    </div>
  );
};