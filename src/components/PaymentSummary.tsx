import React from 'react';

type PaymentSummaryProps = {
  amount: number; // 円（整数前提）
};

const PaymentSummary: React.FC<PaymentSummaryProps> = ({ amount }) => {
  const amt = Number.isFinite(+amount) ? Math.round(+amount) : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-default-text mb-4">決済内容</h3>
      <div className="flex items-center justify-between">
        <span className="text-secondary">合計</span>
        <span className="text-2xl font-bold text-default-text">¥{amt.toLocaleString()}</span>
      </div>
    </div>
  );
};

export default PaymentSummary;
export { PaymentSummary };