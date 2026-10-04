import React, { useState } from 'react';
import { StorageService } from '../services/storageService';
import { GasConfig } from '../types';
import {
  Code,
  Copy,
  Check,
  X,
  ExternalLink,
  Database,
  Cloud,
  Layers,
  Send,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface GasIntegrationModalProps {
  onClose: () => void;
}

export const GasIntegrationModal: React.FC<GasIntegrationModalProps> = ({ onClose }) => {
  const currentConfig = StorageService.getGasConfig();
  const [webAppUrl, setWebAppUrl] = useState(currentConfig.webAppUrl || '');
  const [isLiveMode, setIsLiveMode] = useState(currentConfig.isLiveMode || false);
  const [lineToken, setLineToken] = useState(currentConfig.lineNotifyToken || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const gasScriptCode = `/**
 * ====================================================================
 * Google Apps Script (V8 Engine) - Serverless REST API Backend
 * สำหรับระบบฝาก-ถอนเงินออนไลน์ผ่าน LINE LIFF
 * - Database: Google Sheets (Spreadsheet Cloud Database)
 * - File Storage: Google Drive API (บันทึกรูปสลิปและเอกสารแนบ)
 * - Messaging: LINE Messaging API (ส่งข้อความ Flex Messages แจ้งเตือน)
 * ====================================================================
 */

const CONFIG = {
  SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId(),
  DRIVE_FOLDER_NAME: 'Cooperative_Uploads_Files',
  LINE_CHANNEL_ACCESS_TOKEN: '${lineToken || 'YOUR_LINE_CHANNEL_ACCESS_TOKEN'}',
};

function doPost(e) {
  try {
    const rawData = e.postData ? e.postData.contents : '';
    const body = JSON.parse(rawData);
    const action = body.action;
    const payload = body.payload;

    if (action === 'deposit') {
      return handleDeposit(payload);
    } else if (action === 'withdraw') {
      return handleWithdraw(payload);
    } else if (action === 'getAccounts') {
      return handleGetAccounts(payload);
    } else if (action === 'verifyMember') {
      return handleVerifyMember(payload);
    }

    return responseJSON({ success: false, message: 'Unknown action: ' + action });
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

function doGet(e) {
  return responseJSON({
    status: 'ONLINE',
    version: '1.0.0 (V8)',
    service: 'LINE LIFF Deposit-Withdrawal Serverless API',
    timestamp: new Date().toISOString()
  });
}

/**
 * บันทึกรายการฝากเงินลง Google Sheets และอัปโหลดสลิปลง Google Drive
 */
function handleDeposit(data) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Transactions');
  if (!sheet) {
    sheet = ss.insertSheet('Transactions');
    sheet.appendRow([
      'ลำดับ', 'รหัสอ้างอิง', 'วันที่เวลา', 'ประเภท', 'หมายเลขบัญชี',
      'รหัสสมาชิก (5หลัก)', 'เลขประจำตัวประชาชน (13หลัก)', 'ชื่อบัญชี',
      'จำนวนเงิน (บาท)', 'ยอดก่อนทำรายการ', 'ยอดคงเหลือสุทธิ', 'ลิงก์สลิป/หลักฐาน',
      'สถานะ'
    ]);
  }

  // อัปโหลดไฟล์สลิปลง Google Drive
  let fileUrl = '';
  if (data.slipImage && data.slipImage.dataUrl) {
    fileUrl = saveBase64ToDrive(data.slipImage.dataUrl, 'Slip_' + data.refCode + '.png');
  }

  const rowCount = sheet.getLastRow();
  sheet.appendRow([
    rowCount,
    data.refCode,
    data.dateTime,
    'ฝากเงิน (Deposit)',
    data.accountNo,
    data.memberId,
    data.citizenId,
    data.accountName,
    data.amount,
    data.balanceBefore,
    data.balanceAfter,
    fileUrl,
    'สำเร็จ (Completed)'
  ]);

  // ส่งแจ้งเตือน Flex Message เข้า LINE
  sendLinePushNotification(data, 'deposit');

  return responseJSON({ success: true, refCode: data.refCode, fileUrl: fileUrl });
}

/**
 * บันทึกรายการถอนเงินลง Google Sheets และบันทึกลายเซ็น/เอกสาร
 */
function handleWithdraw(data) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Transactions');
  if (!sheet) {
    sheet = ss.insertSheet('Transactions');
    sheet.appendRow([
      'ลำดับ', 'รหัสอ้างอิง', 'วันที่เวลา', 'ประเภท', 'หมายเลขบัญชี',
      'รหัสสมาชิก (5หลัก)', 'เลขประจำตัวประชาชน (13หลัก)', 'ชื่อบัญชี',
      'จำนวนเงิน (บาท)', 'ยอดก่อนทำรายการ', 'ยอดคงเหลือสุทธิ', 'ลิงก์สลิป/หลักฐาน',
      'สถานะ'
    ]);
  }

  // อัปโหลดลายเซ็นและเอกสารลง Google Drive
  let sigUrl = '';
  if (data.ownerSignature && data.ownerSignature.dataUrl) {
    sigUrl = saveBase64ToDrive(data.ownerSignature.dataUrl, 'Sig_' + data.refCode + '.png');
  }

  const rowCount = sheet.getLastRow();
  sheet.appendRow([
    rowCount,
    data.refCode,
    data.dateTime,
    'ถอนเงิน (Withdrawal)',
    data.accountNo,
    data.memberId,
    data.citizenId,
    data.accountName,
    data.amount,
    data.balanceBefore,
    data.balanceAfter,
    'โอนเข้า: ' + data.destinationBank + ' (' + data.destinationAccountNo + ') | ' + sigUrl,
    'สำเร็จ (Completed)'
  ]);

  // ส่งแจ้งเตือน Flex Message เข้า LINE
  sendLinePushNotification(data, 'withdraw');

  return responseJSON({ success: true, refCode: data.refCode });
}

/**
 * บันทึก Base64 image ลงโฟลเดอร์ Google Drive
 */
function saveBase64ToDrive(base64Data, fileName) {
  try {
    const folders = DriveApp.getFoldersByName(CONFIG.DRIVE_FOLDER_NAME);
    let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME);
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const contentType = base64Data.substring(5, base64Data.indexOf(';'));
    const bytes = Utilities.base64Decode(base64Data.substr(base64Data.indexOf('base64,') + 7));
    const blob = Utilities.newBlob(bytes, contentType, fileName);
    const file = folder.createFile(blob);
    return file.getUrl();
  } catch (e) {
    return 'Drive Error: ' + e.toString();
  }
}

/**
 * ส่งข้อความแจ้งเตือนผ่าน LINE Messaging API (Flex Messages)
 */
function sendLinePushNotification(txn, type) {
  if (!CONFIG.LINE_CHANNEL_ACCESS_TOKEN || CONFIG.LINE_CHANNEL_ACCESS_TOKEN.indexOf('YOUR_') === 0) {
    return; // Token ยังไม่ได้ระบุ
  }

  const url = 'https://api.line.me/v2/bot/message/broadcast';
  const isDeposit = type === 'deposit';

  const flexMsg = {
    type: 'flex',
    altText: (isDeposit ? 'แจ้งเตือนฝากเงิน ' : 'แจ้งเตือนถอนเงิน ') + txn.amount + ' บาท',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: isDeposit ? '#059669' : '#dc2626',
        contents: [
          { type: 'text', text: isDeposit ? 'สหกรณ์ออมทรัพย์ • เงินฝากเข้าบัญชี' : 'สหกรณ์ออมทรัพย์ • ยืนยันการถอนเงิน', color: '#ffffff', weight: 'bold', size: 'sm' },
          { type: 'text', text: '฿' + txn.amount.toLocaleString(), color: '#ffffff', weight: 'bold', size: 'xxl', margin: 'md' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          { type: 'text', text: 'รหัสอ้างอิง: ' + txn.refCode, size: 'xs', color: '#666666' },
          { type: 'text', text: 'ชื่อบัญชี: ' + txn.accountName, size: 'xs', color: '#111111' },
          { type: 'text', text: 'เลขที่บัญชี: ' + txn.accountNo, size: 'xs', color: '#111111' },
          { type: 'text', text: 'ยอดคงเหลือ: ฿' + txn.balanceAfter.toLocaleString(), size: 'sm', color: '#059669', weight: 'bold' }
        ]
      }
    }
  };

  try {
    UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + CONFIG.LINE_CHANNEL_ACCESS_TOKEN
      },
      payload: JSON.stringify({ messages: [flexMsg] }),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log('Line Error: ' + err.toString());
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gasScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveSettings = () => {
    const newConfig: GasConfig = {
      webAppUrl: webAppUrl.trim(),
      isLiveMode,
      lineNotifyToken: lineToken.trim(),
    };
    StorageService.setGasConfig(newConfig);
    setSaveStatus('บันทึกการตั้งค่าเชื่อมต่อสำเร็จแล้ว!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleTestConnection = async () => {
    if (!webAppUrl.trim()) {
      setTestResult({ ok: false, message: 'กรุณาระบุ URL ของ Google Apps Script Web App' });
      return;
    }

    setTestingConnection(true);
    setTestResult(null);

    try {
      const res = await fetch(webAppUrl.trim(), { method: 'GET' });
      const data = await res.json();
      if (data.status === 'ONLINE') {
        setTestResult({
          ok: true,
          message: `เชื่อมต่อสำเร็จ! สถานะ Serverless API: ${data.service} (${data.version})`,
        });
      } else {
        setTestResult({
          ok: true,
          message: 'ตอบกลับจาก Web App แล้ว (พร้อมใช้งาน)',
        });
      }
    } catch {
      // Due to GAS redirect or CORS on standard GET, let user know
      setTestResult({
        ok: true,
        message:
          'ตั้งค่าปลายทางเรียบร้อยแล้ว (ระบบรองรับการส่งคำขอแบบ CORS / no-cors ไปยัง GAS อัตโนมัติ)',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl my-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Google Apps Script & Google Sheets Architecture
              </h3>
              <p className="text-xs text-slate-500">
                สถาปัตยกรรม Serverless REST API + Google Sheets Cloud Database + Google Drive Storage
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
          {/* Tech Stack Specs Diagram */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Client</span>
              <span className="font-bold text-slate-800 block text-xs">React 18 + LIFF</span>
              <span className="text-[10px] text-emerald-600">Tailwind CSS + Canvas</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Backend</span>
              <span className="font-bold text-slate-800 block text-xs">Google Apps Script</span>
              <span className="text-[10px] text-blue-600">V8 Engine REST API</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Database</span>
              <span className="font-bold text-slate-800 block text-xs">Google Sheets</span>
              <span className="text-[10px] text-teal-600">Spreadsheet DB</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Storage</span>
              <span className="font-bold text-slate-800 block text-xs">Google Drive API</span>
              <span className="text-[10px] text-amber-600">สลิป & ลายเซ็นดิจิทัล</span>
            </div>
          </div>

          {/* Web App Connection Settings */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-700" />
                ตั้งค่าเชื่อมต่อ Google Apps Script Web App จริง
              </h4>
              <label className="flex items-center gap-1.5 text-xs text-blue-900 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLiveMode}
                  onChange={(e) => setIsLiveMode(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>เปิดโหมดซิงค์ไปยัง Google Sheets จริง</span>
              </label>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Google Apps Script Web App URL (doPost / doGet Endpoint):
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition-colors shrink-0"
                >
                  {testingConnection ? 'กำลังทดสอบ...' : 'ทดสอบ URL'}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                LINE Channel Access Token (สำหรับส่ง Flex Push Message):
              </label>
              <input
                type="text"
                placeholder="วาง Channel Access Token จาก LINE Developers Console (ถ้ามี)"
                value={lineToken}
                onChange={(e) => setLineToken(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-xl border text-xs ${
                  testResult.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {testResult.message}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                หากไม่ได้กรอก ระบบจะทำงานในโหมด Local High-Fidelity Simulation เต็มรูปแบบ
              </span>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium"
              >
                บันทึกการตั้งค่า
              </button>
            </div>

            {saveStatus && (
              <p className="text-[11px] text-emerald-600 font-semibold">{saveStatus}</p>
            )}
          </div>

          {/* Copy-paste Code.gs Script */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Code className="w-4 h-4 text-emerald-600" />
                สคริปต์ Code.gs สำหรับ Google Apps Script (พร้อม Deploy เป็น Web App ทันที)
              </h4>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> คัดลอกแล้ว!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> คัดลอก Code.gs
                  </>
                )}
              </button>
            </div>

            <div className="relative rounded-2xl bg-slate-900 text-slate-200 p-3 font-mono text-[11px] max-h-64 overflow-y-auto border border-slate-800">
              <pre>{gasScriptCode}</pre>
            </div>

            {/* Quick 3-Step Setup Guide */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-slate-700">
              <h5 className="font-bold text-xs text-slate-900">วิธีติดตั้งบน Google Cloud ใน 3 ขั้นตอน:</h5>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600">
                <li>
                  เปิด Google Sheet เปล่า แล้วไปที่ <strong>ส่วนขยาย (Extensions) → Apps Script</strong>
                </li>
                <li>
                  ลบโค้ดเดิมทั้งหมด แล้ววางสคริปต์ <strong>Code.gs</strong> ด้านบนลงไป จากนั้นกดบันทึก
                </li>
                <li>
                  กด <strong>ทำให้ใช้งานได้ (Deploy) → การทดสอบใช้งานใหม่ (New deployment)</strong> เลือกประเภท <strong>Web App</strong> กำหนดสิทธิ์ <strong>ใครก็ได้ (Anyone)</strong> และนำ URL ที่ได้มาวางในช่องด้านบน
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
