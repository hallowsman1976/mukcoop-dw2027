import React, { useState } from 'react';
import { AdminUser } from '../types';
import { StorageService } from '../services/storageService';
import {
  ShieldAlert,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Building2,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (admin: AdminUser) => void;
  onBackToMemberLogin: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToMemberLogin,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const admin = StorageService.authenticateAdmin(username, password);
      setIsSubmitting(false);

      if (admin) {
        onLoginSuccess(admin);
      } else {
        setError('ชื่อผู้ใช้งานหรือรหัสผ่านเจ้าหน้าที่ไม่ถูกต้อง (กรุณาใช้บัญชีทดสอบด้านล่าง)');
      }
    }, 450);
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
    const admin = StorageService.authenticateAdmin(u, p);
    if (admin) {
      onLoginSuccess(admin);
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 px-4">
      {/* Return to member button */}
      <button
        type="button"
        onClick={onBackToMemberLogin}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>กลับไปยังหน้าสมาชิกสหกรณ์</span>
      </button>

      {/* Header Banner */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-blue-900 text-white shadow-lg shadow-indigo-950/30 mb-3 border border-indigo-800/40">
          <ShieldAlert className="w-7 h-7 text-indigo-300" />
        </div>
        <div className="inline-block bg-indigo-100 text-indigo-900 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 border border-indigo-200">
          Cooperative Officer & Management Portal
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          ระบบจัดการสหกรณ์สำหรับเจ้าหน้าที่ (Admin)
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          ตรวจสอบสลิปเงินฝาก อนุมัติการถอนเงิน และจัดการสมุดบัญชีเงินฝาก
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              ชื่อผู้ใช้งานเจ้าหน้าที่ (Username / Employee ID) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="เช่น admin หรือ teller"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                className="w-full pl-9 pr-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                required
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                รหัสผ่าน (Password) <span className="text-rose-500">*</span>
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="ระบุรหัสผ่านเข้าใช้งาน"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className="w-full pl-9 pr-10 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                required
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            <span>เข้าสู่ระบบเจ้าหน้าที่ (Admin Login)</span>
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> บัญชีทดสอบสำหรับเจ้าหน้าที่ (คลิกเพื่อเข้าใช้งานทันที)
          </span>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'admin1234')}
              className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 text-left transition-all flex items-center justify-between text-xs group"
            >
              <div>
                <div className="font-bold text-slate-900 group-hover:text-indigo-700 flex items-center gap-1.5">
                  <span>ผู้จัดการสหกรณ์ (Super Admin)</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-mono">
                    admin
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  สิทธิ์สูงสุด: อนุมัติธุรกรรม, แก้ไขบัญชี, ซิงค์ Cloud
                </div>
              </div>
              <span className="text-[11px] text-indigo-600 font-semibold group-hover:underline">
                เข้าสู่ระบบ →
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('teller', 'teller1234')}
              className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 text-left transition-all flex items-center justify-between text-xs group"
            >
              <div>
                <div className="font-bold text-slate-900 group-hover:text-indigo-700 flex items-center gap-1.5">
                  <span>เจ้าหน้าที่การเงิน (Teller Officer)</span>
                  <span className="text-[10px] bg-slate-100 text-slate-800 px-1.5 py-0.2 rounded font-mono">
                    teller
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  ตรวจสอบสลิปโอนเงิน และตรวจทานคำขอถอนเงิน
                </div>
              </div>
              <span className="text-[11px] text-indigo-600 font-semibold group-hover:underline">
                เข้าสู่ระบบ →
              </span>
            </button>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <Building2 className="w-3.5 h-3.5" />
          <span>ระบบรักษาความปลอดภัยระดับองค์กรสหกรณ์ออมทรัพย์</span>
        </div>
      </div>
    </div>
  );
};
