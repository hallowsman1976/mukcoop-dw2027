import { BankAccount, Member, TransactionRecord, GasConfig, AdminUser, TransactionStatus, SystemSettings, LoanContract } from '../types';
import { INITIAL_ACCOUNTS, INITIAL_MEMBERS, INITIAL_TRANSACTIONS } from '../data/mockData';
import { INITIAL_LOANS } from '../data/mockLoans';

const DEFAULT_ADMINS: (AdminUser & { passwordHash: string })[] = [
  {
    id: 'adm-01',
    username: 'admin',
    passwordHash: 'admin1234',
    fullName: 'นายวรวิทย์ ผู้จัดการสหกรณ์',
    role: 'superadmin',
    email: 'admin@coop.local',
    department: 'ฝ่ายบริหารและควบคุมความเสี่ยง',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'adm-02',
    username: 'teller',
    passwordHash: 'teller1234',
    fullName: 'นางสาวกานดา เจ้าหน้าที่การเงิน',
    role: 'teller',
    email: 'kanda@coop.local',
    department: 'ฝ่ายบริการสมาชิกและธุรกรรมฝาก-ถอน',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
  },
];

const STORAGE_KEYS = {
  MEMBERS: 'line_liff_members_v1',
  ACCOUNTS: 'line_liff_accounts_v1',
  TRANSACTIONS: 'line_liff_transactions_v1',
  CURRENT_USER: 'line_liff_current_user_v1',
  CURRENT_ADMIN: 'line_liff_current_admin_v1',
  GAS_CONFIG: 'line_liff_gas_config_v1',
  LIFF_ID: 'line_liff_id_v1',
  SYSTEM_SETTINGS: 'line_liff_system_settings_v1',
  LOANS: 'line_liff_loans_v1',
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  cooperativeName: 'สหกรณ์ออมทรัพย์เพื่อการพัฒนา จำกัด',
  registrationNumber: 'กสพ. 102/2545',
  contactPhone: '02-123-4567',
  contactEmail: 'contact@development-coop.or.th',
  officeAddress: 'เลขที่ 99 ถนนพหลโยธิน แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900',
  logoUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=200&q=80',

  regularInterestRate: 1.75,
  specialInterestRate: 2.75,
  minDepositAmount: 100,
  minWithdrawAmount: 100,
  maxDailyWithdrawAmount: 100000,
  minAccountBalance: 500,
  highValueApprovalThreshold: 50000,

  isServiceActive24h: true,
  serviceStartTime: '06:00',
  serviceEndTime: '22:00',
  allowWeekendTransactions: true,
  isMaintenanceMode: false,
  maintenanceMessage: 'ระบบปิดปรับปรุงชั่วคราวเพื่ออัปเกรดฐานข้อมูล กรุณาทำรายการใหม่อีกครั้งในภายหลัง',

  liffId: '2006789012-abcdeXYZ',
  lineOfficialId: '@coop.development',
  lineChannelSecret: 'sec_8849b2c45e89a',
  lineChannelAccessToken: 'ey...coop_messaging_api_long_token',
  enableGlobalLinePush: true,
  notifyStaffOnPendingTxn: true,

  requireDualSignatures: true,
  enableAiSlipVerification: true,
  adminSessionTimeoutMinutes: 30,
};

export const StorageService = {
  // Members
  getMembers(): Member[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(INITIAL_MEMBERS));
      return INITIAL_MEMBERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_MEMBERS;
    }
  },

  findMember(memberIdPadded: string, citizenIdDigits: string): Member | null {
    const members = this.getMembers();
    return (
      members.find(
        (m) =>
          m.memberId === memberIdPadded &&
          m.citizenId.replace(/\D/g, '') === citizenIdDigits.replace(/\D/g, '')
      ) || null
    );
  },

  updateMemberNotificationSettings(memberId: string, settings: import('../types').LineNotificationSettings): boolean {
    const members = this.getMembers();
    const idx = members.findIndex((m) => m.memberId === memberId);
    if (idx === -1) return false;

    members[idx] = {
      ...members[idx],
      notificationSettings: {
        ...settings,
        updatedAt: new Date().toISOString(),
      },
    };

    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));

    // If current user is this member, update current user cache too
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.memberId === memberId) {
      this.setCurrentUser(members[idx]);
    }

    return true;
  },

  // Bank Accounts
  getAccounts(): BankAccount[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(INITIAL_ACCOUNTS));
      return INITIAL_ACCOUNTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_ACCOUNTS;
    }
  },

  getAccountsByMember(memberId: string): BankAccount[] {
    const accounts = this.getAccounts();
    return accounts.filter((a) => a.memberId === memberId);
  },

  getAccountByNo(accountNo: string): BankAccount | null {
    const accounts = this.getAccounts();
    return accounts.find((a) => a.accountNo === accountNo) || null;
  },

  // Current logged in user
  getCurrentUser(): Member | null {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setCurrentUser(member: Member | null) {
    if (member) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(member));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  // Transactions
  getTransactions(): TransactionRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
      return INITIAL_TRANSACTIONS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  },

  getTransactionsByMember(memberId: string): TransactionRecord[] {
    const txs = this.getTransactions();
    return txs.filter((t) => t.memberId === memberId);
  },

  // Calculate daily withdrawal total for a member
  getMemberDailyWithdrawalTotal(memberId: string, datePrefix?: string): number {
    const today = datePrefix || new Date().toISOString().slice(0, 10);
    const txs = this.getTransactions();
    return txs
      .filter((t) => t.memberId === memberId && t.type === 'withdraw' && t.status !== 'rejected')
      .filter((t) => (t.dateTime && t.dateTime.startsWith(today)) || (t.createdAt && t.createdAt.startsWith(today)))
      .reduce((sum, t) => sum + t.amount, 0);
  },

  // Calculate monthly withdrawal count for a specific account
  getMonthlyAccountWithdrawalCount(accountNo: string, yearMonth?: string): number {
    const currentYM = yearMonth || new Date().toISOString().slice(0, 7);
    const txs = this.getTransactions();
    return txs
      .filter((t) => t.accountNo === accountNo && t.type === 'withdraw' && t.status !== 'rejected')
      .filter((t) => (t.dateTime && t.dateTime.startsWith(currentYM)) || (t.createdAt && t.createdAt.startsWith(currentYM)))
      .length;
  },

  // Add transaction and update account balance (ยอดฝาก-ถอน ต้องสัมพันธ์กัน)
  recordTransaction(txn: Omit<TransactionRecord, 'id' | 'refCode' | 'balanceBefore' | 'balanceAfter' | 'createdAt'>): {
    success: boolean;
    transaction?: TransactionRecord;
    error?: string;
  } {
    const accounts = this.getAccounts();
    const accountIndex = accounts.findIndex((a) => a.accountNo === txn.accountNo);

    if (accountIndex === -1) {
      return { success: false, error: 'ไม่พบบัญชีเงินฝากที่ระบุ' };
    }

    const currentAccount = accounts[accountIndex];
    const balanceBefore = currentAccount.balance;
    let balanceAfter = balanceBefore;
    let fee = 0;
    let feeRate = 0;
    let totalDeduction = txn.amount;
    let monthlyCount = 0;

    if (txn.type === 'deposit') {
      balanceAfter = balanceBefore + txn.amount;
    } else if (txn.type === 'withdraw') {
      // Rule 1: Special Savings (ออมทรัพย์พิเศษ) -> 1 free withdrawal/month, 2nd onward = 3% fee
      if (currentAccount.accountType === 'ออมทรัพย์พิเศษ') {
        monthlyCount = this.getMonthlyAccountWithdrawalCount(txn.accountNo);
        if (monthlyCount >= 1) {
          feeRate = 3;
          fee = Math.round(txn.amount * 0.03 * 100) / 100;
        }
      } else {
        // Regular Savings (ออมทรัพย์) -> Unlimited, 0 fee
        fee = 0;
        feeRate = 0;
      }

      totalDeduction = txn.amount + fee;

      if (totalDeduction > balanceBefore) {
        return {
          success: false,
          error: `ยอดเงินในบัญชีไม่เพียงพอสำหรับการถอน (ยอดถอน ฿${txn.amount.toLocaleString()}${fee > 0 ? ` + ค่าธรรมเนียม 3% ฿${fee.toLocaleString()}` : ''} = รวมหัก ฿${totalDeduction.toLocaleString()} แต่ยอดคงเหลือปัจจุบันมี ฿${balanceBefore.toLocaleString()})`,
        };
      }
      balanceAfter = balanceBefore - totalDeduction;
    }

    // Update account balance and last updated timestamp
    accounts[accountIndex] = {
      ...currentAccount,
      balance: balanceAfter,
      lastUpdated: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));

    // Generate reference code
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomSuffix = String(Math.floor(1000 + Math.random() * 9000));
    const refCode = `TXN-${dateStr}-${randomSuffix}`;

    const newRecord: TransactionRecord = {
      ...txn,
      id: `tx-${Date.now()}`,
      refCode,
      fee: fee > 0 ? fee : (txn.fee || 0),
      feeRate: feeRate > 0 ? feeRate : (txn.feeRate || 0),
      totalDeduction: txn.type === 'withdraw' ? totalDeduction : txn.amount,
      monthlyWithdrawalCount: txn.type === 'withdraw' ? monthlyCount + 1 : undefined,
      balanceBefore,
      balanceAfter,
      createdAt: now.toISOString(),
    };

    const txs = this.getTransactions();
    txs.unshift(newRecord);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));

    // If Google Apps Script Web App URL is set and live mode is active, attempt background sync
    this.syncToGas(newRecord);

    return { success: true, transaction: newRecord };
  },

  // GAS Web App configuration
  getGasConfig(): GasConfig {
    const raw = localStorage.getItem(STORAGE_KEYS.GAS_CONFIG);
    if (!raw) {
      return {
        webAppUrl: '',
        isLiveMode: false,
        sheetId: '',
        lineNotifyToken: '',
      };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return { webAppUrl: '', isLiveMode: false };
    }
  },

  setGasConfig(config: GasConfig) {
    localStorage.setItem(STORAGE_KEYS.GAS_CONFIG, JSON.stringify(config));
  },

  async syncToGas(txn: TransactionRecord): Promise<boolean> {
    const config = this.getGasConfig();
    if (!config.isLiveMode || !config.webAppUrl) return false;

    try {
      await fetch(config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // GAS CORS-friendly
        body: JSON.stringify({
          action: txn.type === 'deposit' ? 'deposit' : 'withdraw',
          payload: txn,
        }),
      });
      return true;
    } catch {
      return false;
    }
  },

  // LIFF ID configuration
  getLiffId(): string {
    return localStorage.getItem(STORAGE_KEYS.LIFF_ID) || '';
  },

  setLiffId(id: string) {
    localStorage.setItem(STORAGE_KEYS.LIFF_ID, id);
  },

  // Admin Authentication & Session
  authenticateAdmin(username: string, password: string): AdminUser | null {
    const found = DEFAULT_ADMINS.find(
      (a) => a.username.toLowerCase() === username.trim().toLowerCase() && a.passwordHash === password.trim()
    );
    if (found) {
      const { passwordHash, ...user } = found;
      const adminSession: AdminUser = {
        ...user,
        lastLogin: new Date().toISOString(),
      };
      this.setCurrentAdmin(adminSession);
      return adminSession;
    }
    return null;
  },

  getCurrentAdmin(): AdminUser | null {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_ADMIN);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setCurrentAdmin(admin: AdminUser | null) {
    if (admin) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_ADMIN, JSON.stringify(admin));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_ADMIN);
    }
  },

  updateTransactionStatus(
    txnId: string,
    status: TransactionStatus,
    reviewNote?: string,
    adminName?: string
  ): boolean {
    const txs = this.getTransactions();
    const idx = txs.findIndex((t) => t.id === txnId);
    if (idx === -1) return false;

    const txn = txs[idx];
    const previousStatus = txn.status;

    // If was completed and now rejected, revert account balance
    if (previousStatus === 'completed' && status === 'rejected') {
      const accounts = this.getAccounts();
      const accIdx = accounts.findIndex((a) => a.accountNo === txn.accountNo);
      if (accIdx !== -1) {
        const acc = accounts[accIdx];
        if (txn.type === 'deposit') {
          // Revert deposit
          accounts[accIdx] = {
            ...acc,
            balance: Math.max(0, acc.balance - txn.amount),
            lastUpdated: new Date().toISOString().replace('T', ' ').slice(0, 16),
          };
        } else if (txn.type === 'withdraw') {
          // Revert withdrawal
          accounts[accIdx] = {
            ...acc,
            balance: acc.balance + txn.amount,
            lastUpdated: new Date().toISOString().replace('T', ' ').slice(0, 16),
          };
        }
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
      }
    }

    txs[idx] = {
      ...txn,
      status,
      reviewNote: reviewNote || txn.reviewNote,
      reviewedBy: adminName || txn.reviewedBy || 'เจ้าหน้าที่ผู้ดูแลระบบ',
      reviewedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
    return true;
  },

  addMember(member: Member) {
    const members = this.getMembers();
    members.push(member);
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  },

  addAccount(account: BankAccount) {
    const accounts = this.getAccounts();
    accounts.push(account);
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  },

  batchAddMembersAndAccounts(
    newMembers: Member[],
    newAccounts: BankAccount[],
    updateExisting: boolean = true
  ): { addedMembers: number; addedAccounts: number } {
    const members = [...this.getMembers()];
    const accounts = [...this.getAccounts()];

    let addedMembersCount = 0;
    let addedAccountsCount = 0;

    newMembers.forEach((newM) => {
      const existingIdx = members.findIndex((m) => m.memberId === newM.memberId);
      if (existingIdx !== -1) {
        if (updateExisting) {
          members[existingIdx] = {
            ...members[existingIdx],
            ...newM,
          };
        }
      } else {
        members.push(newM);
        addedMembersCount++;
      }
    });

    newAccounts.forEach((newA) => {
      const existingIdx = accounts.findIndex((a) => a.accountNo === newA.accountNo);
      if (existingIdx !== -1) {
        if (updateExisting) {
          accounts[existingIdx] = {
            ...accounts[existingIdx],
            ...newA,
          };
        }
      } else {
        accounts.push(newA);
        addedAccountsCount++;
      }
    });

    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));

    return { addedMembers: addedMembersCount, addedAccounts: addedAccountsCount };
  },

  // System Settings
  getSystemSettings(): SystemSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SYSTEM_SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SYSTEM_SETTINGS, JSON.stringify(DEFAULT_SYSTEM_SETTINGS));
      return DEFAULT_SYSTEM_SETTINGS;
    }
    try {
      return {
        ...DEFAULT_SYSTEM_SETTINGS,
        ...JSON.parse(raw),
      };
    } catch {
      return DEFAULT_SYSTEM_SETTINGS;
    }
  },

  saveSystemSettings(settings: SystemSettings) {
    localStorage.setItem(STORAGE_KEYS.SYSTEM_SETTINGS, JSON.stringify(settings));
    // Also sync LIFF ID if changed
    if (settings.liffId) {
      localStorage.setItem(STORAGE_KEYS.LIFF_ID, settings.liffId);
    }
  },

  resetSystemSettings(): SystemSettings {
    localStorage.setItem(STORAGE_KEYS.SYSTEM_SETTINGS, JSON.stringify(DEFAULT_SYSTEM_SETTINGS));
    return DEFAULT_SYSTEM_SETTINGS;
  },

  // Loans Management
  getLoans(): LoanContract[] {
    const raw = localStorage.getItem(STORAGE_KEYS.LOANS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(INITIAL_LOANS));
      return INITIAL_LOANS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_LOANS;
    }
  },

  getLoansByMember(memberId: string): LoanContract[] {
    return this.getLoans().filter((l) => l.memberId === memberId);
  },

  saveLoans(loans: LoanContract[]) {
    localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans));
  },

  payLoanInstallment(
    contractId: string,
    installmentNo: number,
    paymentMethod: 'account' | 'transfer',
    accountNo?: string,
    slipImage?: any
  ): { success: boolean; message: string; transaction?: TransactionRecord } {
    const loans = this.getLoans();
    const loanIdx = loans.findIndex((l) => l.id === contractId);
    if (loanIdx === -1) {
      return { success: false, message: 'ไม่พบสัญญาเงินกู้' };
    }

    const loan = loans[loanIdx];
    const instIdx = loan.installments.findIndex((ins) => ins.installmentNo === installmentNo);
    if (instIdx === -1) {
      return { success: false, message: 'ไม่พบงวดการชำระที่ระบุ' };
    }

    const installment = loan.installments[instIdx];
    if (installment.status === 'paid') {
      return { success: false, message: 'งวดนี้ได้รับการชำระเงินเรียบร้อยแล้ว' };
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const refCode = `TXN-LN-${Date.now().toString().slice(-6)}`;
    const receiptNo = `RC-2569-${Date.now().toString().slice(-4)}`;

    let transactionRecord: TransactionRecord | undefined;

    if (paymentMethod === 'account') {
      // Auto deduct from member deposit account
      const accounts = this.getAccounts();
      const targetAccNo = accountNo || loan.accountNo;
      const accIdx = accounts.findIndex((a) => a.accountNo === targetAccNo);
      if (accIdx === -1) {
        return { success: false, message: 'ไม่พบบัญชีเงินฝากที่ต้องการหักชำระ' };
      }

      const acc = accounts[accIdx];
      if (acc.balance < installment.totalAmount) {
        return {
          success: false,
          message: `ยอดเงินในบัญชี (${acc.balance.toLocaleString()} บาท) ไม่เพียงพอต่อการชำระค่างวด (${installment.totalAmount.toLocaleString()} บาท)`,
        };
      }

      const balanceBefore = acc.balance;
      const balanceAfter = balanceBefore - installment.totalAmount;

      // Update account balance
      accounts[accIdx] = {
        ...acc,
        balance: balanceAfter,
        lastUpdated: nowStr,
      };
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));

      // Create transaction record integrated into transactions history
      transactionRecord = {
        id: `txn-${Date.now()}`,
        refCode,
        type: 'withdraw',
        accountNo: acc.accountNo,
        accountName: acc.accountName,
        accountType: acc.accountType,
        memberId: loan.memberId,
        citizenId: loan.borrowerCitizenId,
        amount: installment.totalAmount,
        balanceBefore,
        balanceAfter,
        dateTime: nowStr,
        status: 'completed',
        reviewedBy: 'ระบบหักบัญชีเงินกู้อัตโนมัติ (Auto-Debit)',
        reviewNote: `ชำระค่างวดสินเชื่อสัญญา ${loan.contractNo} งวดที่ ${installment.installmentNo}/${loan.termMonths} (เงินต้น ฿${installment.principal.toLocaleString()}, ดอกเบี้ย ฿${installment.interest.toLocaleString()})`,
        reviewedAt: nowStr,
        createdAt: nowStr,
      };

      const txs = this.getTransactions();
      txs.unshift(transactionRecord);
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
    } else {
      // Transfer & Slip payment
      transactionRecord = {
        id: `txn-${Date.now()}`,
        refCode,
        type: 'deposit',
        accountNo: loan.accountNo,
        accountName: loan.borrowerName,
        accountType: 'ออมทรัพย์',
        memberId: loan.memberId,
        citizenId: loan.borrowerCitizenId,
        amount: installment.totalAmount,
        balanceBefore: 0,
        balanceAfter: 0,
        dateTime: nowStr,
        status: 'completed',
        reviewedBy: 'ระบบตรวจสอบการชำระค่างวด',
        reviewNote: `ชำระค่างวดสินเชื่อสัญญา ${loan.contractNo} งวดที่ ${installment.installmentNo}/${loan.termMonths} ผ่านการโอนเงิน`,
        reviewedAt: nowStr,
        createdAt: nowStr,
        slipImage,
      };

      const txs = this.getTransactions();
      txs.unshift(transactionRecord);
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
    }

    // Update installment
    loan.installments[instIdx] = {
      ...installment,
      status: 'paid',
      paidAmount: installment.totalAmount,
      paidDate: nowStr,
      txnRef: refCode,
      receiptNo,
    };

    // Update loan summary
    loan.remainingBalance = Math.max(0, loan.remainingBalance - installment.principal);
    loan.totalPaidPrincipal += installment.principal;
    loan.totalPaidInterest += installment.interest;
    loan.paidInstallmentsCount += 1;
    loan.nextDueInstallmentNo = Math.min(loan.termMonths, loan.paidInstallmentsCount + 1);

    if (loan.paidInstallmentsCount >= loan.termMonths || loan.remainingBalance <= 0) {
      loan.status = 'completed';
    }

    loans[loanIdx] = loan;
    this.saveLoans(loans);

    return {
      success: true,
      message: `ชำระค่างวดที่ ${installment.installmentNo} สัญญา ${loan.contractNo} สำเร็จ ยอดชำระ ฿${installment.totalAmount.toLocaleString()}`,
      transaction: transactionRecord,
    };
  },

  // Reset demo data
  resetAll() {
    localStorage.removeItem(STORAGE_KEYS.MEMBERS);
    localStorage.removeItem(STORAGE_KEYS.ACCOUNTS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.SYSTEM_SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.LOANS);
  },
};
