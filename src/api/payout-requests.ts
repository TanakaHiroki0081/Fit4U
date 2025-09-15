import { supabase } from '../lib/supabase';

export interface CreatePayoutRequestData {
  trainerId: string;
  periodStart: string;
  periodEnd: string;
}

export const createPayoutRequest = async ({ trainerId, periodStart, periodEnd }: CreatePayoutRequestData) => {
  try {
    // Calculate total sales for the period
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        amount,
        net_amount,
        lesson:lessons!inner(trainer_id, date, status)
      `)
      .eq('lesson.trainer_id', trainerId)
      .eq('lesson.status', 'completed')
      .gte('lesson.date', periodStart)
      .lte('lesson.date', periodEnd)
      .eq('status', 'paid');

    if (paymentsError) throw paymentsError;

    const totalSales = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    const payoutAmount = Math.floor(totalSales * 0.8); // 80% of total sales
    const transferFee = 250; // Fixed transfer fee
    const netPayout = payoutAmount - transferFee;

    // Calculate payout eligible date (10 business days after period end)
    const periodEndDate = new Date(periodEnd);
    const payoutEligibleDate = new Date(periodEndDate);
    payoutEligibleDate.setMonth(payoutEligibleDate.getMonth() + 1);
    
    // Add 10 business days
    let businessDays = 0;
    while (businessDays < 10) {
      payoutEligibleDate.setDate(payoutEligibleDate.getDate() + 1);
      const dayOfWeek = payoutEligibleDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
        businessDays++;
      }
    }

    const { data, error } = await supabase
      .from('payout_requests')
      .insert({
        trainer_id: trainerId,
        period_start: periodStart,
        period_end: periodEnd,
        total_sales: totalSales,
        payout_amount: payoutAmount,
        transfer_fee: transferFee,
        net_payout: netPayout,
        payout_eligible_date: payoutEligibleDate.toISOString().split('T')[0]
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating payout request:', error);
    return { data: null, error };
  }
};

export const approvePayoutRequest = async (payoutRequestId: string) => {
  try {
    const { data, error } = await supabase
      .from('payout_requests')
      .update({
        status: 'approved',
        approval_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', payoutRequestId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error approving payout request:', error);
    return { data: null, error };
  }
};

export const generatePayoutCSV = async (payoutRequestIds: string[]) => {
  try {
    // Get payout requests with trainer bank account info
    const { data: payoutRequests, error } = await supabase
      .from('payout_requests')
      .select(`
        *,
        trainer:users!inner!payout_requests_trainer_id_fkey(
          id,
          name,
          trainer_bank_accounts:trainer_bank_accounts!inner!trainer_bank_accounts_trainer_id_fkey(
            bank_name,
            branch_code,
            account_type,
            account_number,
            account_holder_kana
          )
        )
      `)
      .in('id', payoutRequestIds)
      .eq('status', 'approved');

    if (error) throw error;

    // Generate CSV content
    const csvRows = payoutRequests?.map(request => {
      const bankAccount = request.trainer.trainer_bank_accounts[0];
      if (!bankAccount) {
        throw new Error(`Bank account not found for trainer ${request.trainer.name}`);
      }

      // Get bank code from bank name (simplified mapping)
      const bankCodeMap: Record<string, string> = {
        'みずほ銀行': '0001',
        '三菱UFJ銀行': '0005',
        '三井住友銀行': '0009',
        'りそな銀行': '0010',
      };

      const bankCode = bankCodeMap[bankAccount.bank_name] || '0000';
      const branchCode = bankAccount.branch_code.padStart(3, '0');
      const accountType = bankAccount.account_type === 'savings' ? '1' : '2';
      const accountNumber = bankAccount.account_number.padStart(7, '0');
      const accountHolderKana = bankAccount.account_holder_kana;
      const amount = request.net_payout;
      const feeType = '2'; // Fixed
      const requesterName = 'ﾌｨｯﾄﾌｫｰﾕｰ'; // Fixed

      return [
        bankCode,
        branchCode,
        accountType,
        accountNumber,
        accountHolderKana,
        amount.toString(),
        feeType,
        requesterName
      ].join(',');
    }) || [];

    const csvContent = csvRows.join('\n');

    // Update payout requests to paid status
    const { error: updateError } = await supabase
      .from('payout_requests')
      .update({
        status: 'paid',
        payout_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', payoutRequestIds);

    if (updateError) throw updateError;

    return { csvContent, error: null };
  } catch (error) {
    console.error('Error generating payout CSV:', error);
    return { csvContent: null, error };
  }
};
