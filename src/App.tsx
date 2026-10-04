/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Member, BankAccount, TransactionRecord, AdminUser } from './types';
import { StorageService } from './services/storageService';
import { LiffService, LiffStatus } from './services/liffService';
import { Header } from './components/Header';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { AccountsTable } from './components/AccountsTable';
import { DepositForm } from './components/DepositForm';
import { WithdrawForm } from './components/WithdrawForm';
import { TransactionHistory } from './components/TransactionHistory';
import { FlexMessageModal } from './components/FlexMessageModal';
import { GasIntegrationModal } from './components/GasIntegrationModal';
import { LiffConfigModal } from './components/LiffConfigModal';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { NotificationSettings } from './components/NotificationSettings';
import { LoansView } from './components/LoansView';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  FileSpreadsheet,
  Smartphone,
  Cloud,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react';

export default function App() {
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [viewMode, setViewMode] = useState<'member' | 'admin'>('member');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'deposit' | 'withdraw' | 'history' | 'loans' | 'notifications'>('dashboard');
  const [selectedAccountForAction, setSelectedAccountForAction] = useState<BankAccount | null>(null);

  // Modals
  const [flexModalTxn, setFlexModalTxn] = useState<TransactionRecord | null>(null);
  const [showGasModal, setShowGasModal] = useState<boolean>(false);
  const [showLiffModal, setShowLiffModal] = useState<boolean>(false);

  // LIFF Status
  const [liffStatus, setLiffStatus] = useState<LiffStatus>({
    isReady: false,
    isInClient: false,
    isLoggedIn: false,
    os: 'web',
    liffId: '',
    profile: null,
  });

  const [notification, setNotification] = useState<{
    type: 'success' | 'info';
    message: string;
  } | null>(null);

  // Load data and init LIFF
  const refreshData = () => {
    const accs = StorageService.getAccounts();
    const txs = StorageService.getTransactions();
    const user = StorageService.getCurrentUser();
    const admin = StorageService.getCurrentAdmin();
    const mems = StorageService.getMembers();
    setAccounts(accs);
    setTransactions(txs);
    setCurrentMember(user);
    setCurrentAdmin(admin);
    setMembers(mems);
  };

  useEffect(() => {
    refreshData();

    // Initialize LINE LIFF
    LiffService.init().then((status) => {
      setLiffStatus(status);
    });
  }, []);

  const handleLoginSuccess = (member: Member) => {
    setCurrentMember(member);
    refreshData();
    setViewMode('member');
    setActiveTab('dashboard');
    showNotification(`ยินดีต้อนรับคุณ ${member.fullName} (รหัสสมาชิก ${member.memberId})`);
  };

  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setCurrentMember(null);
    setActiveTab('dashboard');
    showNotification('ออกจากระบบเรียบร้อยแล้ว');
  };

  const handleAdminLoginSuccess = (admin: AdminUser) => {
    setCurrentAdmin(admin);
    setViewMode('admin');
    refreshData();
    showNotification(`ยินดีต้อนรับเจ้าหน้าที่ ${admin.fullName} (${admin.role === 'superadmin' ? 'Super Admin' : 'Teller'})`);
  };

  const handleAdminLogout = () => {
    StorageService.setCurrentAdmin(null);
    setCurrentAdmin(null);
    setViewMode('member');
    showNotification('ออกจากระบบเจ้าหน้าที่แล้ว');
  };

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSelectAccountAction = (account: BankAccount, action: 'deposit' | 'withdraw') => {
    setSelectedAccountForAction(account);
    setActiveTab(action);
  };

  const handleTransactionSuccess = (txn: TransactionRecord) => {
    refreshData();

    // Check user's notification preferences
    const notifySettings = currentMember?.notificationSettings;
    const isPushEnabled = notifySettings ? notifySettings.enableLinePush : true;
    const shouldNotifyType =
      txn.type === 'deposit'
        ? notifySettings ? notifySettings.notifyOnDeposit : true
        : notifySettings ? notifySettings.notifyOnWithdraw : true;
    const meetsThreshold = notifySettings
      ? txn.amount >= (notifySettings.minimumAmount || 0)
      : true;

    const willPushToLine = isPushEnabled && shouldNotifyType && meetsThreshold;

    if (willPushToLine) {
      // Open LINE Flex Message preview modal directly so user sees the LINE notification!
      setFlexModalTxn(txn);
      showNotification(
        `${txn.type === 'deposit' ? 'ฝากเงิน' : 'ถอนเงิน'} สำเร็จ! ส่งการแจ้งเตือนเข้า LINE เรียบร้อย 🔔 (ยอดคงเหลือ ฿${txn.balanceAfter.toLocaleString('th-TH', { minimumFractionDigits: 2 })})`
      );
    } else {
      showNotification(
        `${txn.type === 'deposit' ? 'ฝากเงิน' : 'ถอนเงิน'} สำเร็จ! (ปิดการแจ้งเตือน LINE สำหรับรายการนี้ไว้)`
      );
    }
  };

  const handleTestNotificationPush = () => {
    const sampleTxn: TransactionRecord = {
      id: `test-${Date.now()}`,
      refCode: `TEST-${Date.now().toString().slice(-6)}`,
      type: 'deposit',
      accountNo: accounts[0]?.accountNo || '101-2-00128-1',
      accountName: currentMember?.fullName || 'ทดสอบสมาชิก',
      accountType: 'ออมทรัพย์',
      memberId: currentMember?.memberId || '00128',
      citizenId: currentMember?.citizenId || '1100200345670',
      amount: 1000,
      balanceBefore: accounts[0]?.balance || 50000,
      balanceAfter: (accounts[0]?.balance || 50000) + 1000,
      dateTime: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'completed',
      note: 'ทดสอบส่งการแจ้งเตือนผ่าน LINE Messaging API Push',
      createdAt: new Date().toISOString(),
    };
    setFlexModalTxn(sampleTxn);
    showNotification('ส่งตัวอย่างข้อความแจ้งเตือนเข้า LINE สำเร็จ 🔔');
  };

  const gasConfig = StorageService.getGasConfig();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Prompt',sans-serif] text-slate-800">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-14 right-4 z-50 animate-in slide-in-from-top-3 fade-in duration-200">
          <div className="bg-slate-900 text-white text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header and Nav */}
      <Header
        currentMember={currentMember}
        currentAdmin={currentAdmin}
        accounts={accounts}
        activeTab={activeTab}
        viewMode={viewMode}
        onSelectTab={setActiveTab}
        onLogout={handleLogout}
        onOpenLiffConfig={() => setShowLiffModal(true)}
        onOpenGasModal={() => setShowGasModal(true)}
        onToggleViewMode={(mode) => setViewMode(mode)}
        liffConnected={liffStatus.isInClient || !!liffStatus.liffId}
        gasConnected={gasConfig.isLiveMode && !!gasConfig.webAppUrl}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {viewMode === 'admin' ? (
          // Admin View: Admin Dashboard or Admin Login
          currentAdmin ? (
            <div className="animate-in fade-in duration-150">
              <AdminDashboard
                currentAdmin={currentAdmin}
                accounts={accounts}
                transactions={transactions}
                members={members}
                onRefreshData={refreshData}
                onLogoutAdmin={handleAdminLogout}
                onSwitchToMemberView={() => setViewMode('member')}
                onOpenFlexModal={(txn) => setFlexModalTxn(txn)}
                onOpenGasModal={() => setShowGasModal(true)}
              />
            </div>
          ) : (
            <div className="animate-in fade-in duration-150">
              <AdminLogin
                onLoginSuccess={handleAdminLoginSuccess}
                onBackToMemberLogin={() => setViewMode('member')}
              />
            </div>
          )
        ) : (
          // Member View: Member Login or Member Dashboard / Features
          !currentMember ? (
            // Login / Identity Verification View
            <div className="space-y-6">
              <LoginForm
                onLoginSuccess={handleLoginSuccess}
                liffProfile={liffStatus.profile}
                onOpenLiffConfig={() => setShowLiffModal(true)}
              />

              {/* Quick switch to Admin portal */}
              <div className="max-w-md mx-auto text-center">
                <button
                  type="button"
                  onClick={() => setViewMode('admin')}
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-700 hover:text-indigo-900 font-semibold bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-1.5 rounded-full transition-all cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>เจ้าหน้าที่สหกรณ์? เข้าสู่ระบบ Admin Dashboard ที่นี่ →</span>
                </button>
              </div>

              {/* Public preview of Accounts Table */}
              <div className="pt-6 border-t border-slate-200/80">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    ตัวอย่างตารางข้อมูลบัญชีเงินฝากสหกรณ์ในระบบ
                  </span>
                  <span className="text-[11px] text-emerald-600 font-medium">
                    กรุณาเข้าสู่ระบบเพื่อทำรายการฝาก-ถอน
                  </span>
                </div>
                <AccountsTable
                  accounts={accounts}
                  currentMember={null}
                  onSelectAction={(acc, action) => {
                    const m = StorageService.getMembers().find((mem) => mem.memberId === acc.memberId);
                    if (m) {
                      handleLoginSuccess(m);
                      setSelectedAccountForAction(acc);
                      setActiveTab(action);
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            // Logged-in Portal Views
            <div>
              {activeTab === 'dashboard' && (
                <div className="animate-in fade-in duration-150">
                  <Dashboard
                    currentMember={currentMember}
                    accounts={accounts}
                    transactions={transactions}
                    onNavigateTab={setActiveTab}
                    onQuickAction={handleSelectAccountAction}
                    onOpenFlexModal={(txn) => setFlexModalTxn(txn)}
                  />
                </div>
              )}

              {activeTab === 'accounts' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <AccountsTable
                    accounts={accounts}
                    currentMember={currentMember}
                    onSelectAction={handleSelectAccountAction}
                  />
                </div>
              )}

              {activeTab === 'deposit' && (
                <div className="animate-in fade-in duration-150">
                  <DepositForm
                    currentMember={currentMember}
                    accounts={accounts}
                    initialAccount={selectedAccountForAction}
                    onSuccess={handleTransactionSuccess}
                    onCancel={() => setActiveTab('dashboard')}
                  />
                </div>
              )}

              {activeTab === 'withdraw' && (
                <div className="animate-in fade-in duration-150">
                  <WithdrawForm
                    currentMember={currentMember}
                    accounts={accounts}
                    initialAccount={selectedAccountForAction}
                    onSuccess={handleTransactionSuccess}
                    onCancel={() => setActiveTab('dashboard')}
                  />
                </div>
              )}

              {activeTab === 'history' && (
                <div className="animate-in fade-in duration-150">
                  <TransactionHistory
                    transactions={transactions}
                    onOpenFlexModal={(txn) => setFlexModalTxn(txn)}
                  />
                </div>
              )}

              {activeTab === 'loans' && (
                <div className="animate-in fade-in duration-150">
                  <LoansView
                    currentMember={currentMember}
                    accounts={accounts}
                    transactions={transactions}
                    onRefreshData={refreshData}
                    onOpenFlexModal={(txn) => setFlexModalTxn(txn)}
                  />
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="animate-in fade-in duration-150">
                  <NotificationSettings
                    currentMember={currentMember}
                    liffProfile={liffStatus.profile}
                    onUpdateMember={(updated) => {
                      setCurrentMember(updated);
                      refreshData();
                    }}
                    onTestPush={handleTestNotificationPush}
                  />
                </div>
              )}
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>ระบบฝาก-ถอนเงินออนไลน์ผ่าน LINE LIFF (React 18 + Google Apps Script V8 + Google Sheets)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowGasModal(true)}
              className="text-slate-500 hover:text-blue-600 underline flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>คู่มือ Google Sheets / Apps Script (Code.gs)</span>
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setShowLiffModal(true)}
              className="text-slate-500 hover:text-[#06C755] underline flex items-center gap-1"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>ตั้งค่า LINE LIFF</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {flexModalTxn && (
        <FlexMessageModal
          transaction={flexModalTxn}
          onClose={() => setFlexModalTxn(null)}
        />
      )}

      {showGasModal && (
        <GasIntegrationModal onClose={() => setShowGasModal(false)} />
      )}

      {showLiffModal && (
        <LiffConfigModal
          status={liffStatus}
          onClose={() => setShowLiffModal(false)}
          onRefresh={() => {
            LiffService.init().then((st) => setLiffStatus(st));
          }}
        />
      )}
    </div>
  );
}
