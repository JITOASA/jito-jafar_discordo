import React, { useState } from 'react';
import { BookOpen, Key, Terminal, Server, CheckCircle2, Copy, Play, ShieldAlert, Sparkles, ExternalLink } from 'lucide-react';

export const SetupGuide: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deployLoading, setDeployLoading] = useState(false);
  const [deployResult, setDeployResult] = useState<{ success: boolean; message: string } | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDeployCommands = async () => {
    setDeployLoading(true);
    setDeployResult(null);
    try {
      const res = await fetch('/api/bot/deploy-commands', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setDeployResult({ success: true, message: `تم تسجيل ${data.count || 5} أوامر سلاش بنجاح في ديسكورد!` });
      } else {
        setDeployResult({ success: false, message: data.error || 'فشل التسجيل. تأكد من ضبط DISCORD_TOKEN و DISCORD_CLIENT_ID.' });
      }
    } catch (err: any) {
      setDeployResult({ success: false, message: err.message || 'خطأ في الاتصال' });
    } finally {
      setDeployLoading(false);
    }
  };

  const envSample = `# DISCORD_TOKEN: توكن البوت الخاص بك
DISCORD_TOKEN="OTExMjM0NTY3ODkwMTIzNDU2.Gz9abc..."

# DISCORD_CLIENT_ID: معرف التطبيق (Application ID)
DISCORD_CLIENT_ID="123456789012345678"

# DISCORD_GUILD_ID: (اختياري) معرف سيرفرك للتحديث الفوري لأوامر السلاش
DISCORD_GUILD_ID="987654321098765432"

# PORT: منفذ الخادم
PORT=3000`;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              دليل تشغيل واستضافة بوت جعفر
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              خطوات سريعة وواضحة لإطلاق البوت على سيرفرك الخاص أو استضافته خارجياً على أي سيرفر VPS أو سحابة.
            </p>
          </div>

          <button
            id="deploy-slash-commands-btn"
            onClick={handleDeployCommands}
            disabled={deployLoading}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            <span>{deployLoading ? 'جاري تسجيل الأوامر...' : 'تسجيل أوامر السلاش في ديسكورد'}</span>
          </button>
        </div>

        {deployResult && (
          <div className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
            deployResult.success ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
          }`}>
            {deployResult.success ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            <span>{deployResult.message}</span>
          </div>
        )}
      </div>

      {/* Step by Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Step 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-sm border border-indigo-500/30">
            1
          </div>
          <h3 className="font-bold text-white text-base">إنشاء تطبيق ديسكورد</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            افتح <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-indigo-400 underline inline-flex items-center gap-1">Discord Developer Portal <ExternalLink className="w-3 h-3" /></a> وأنشئ تطبيقاً جديداً باسم <strong>"جعفر"</strong>.
          </p>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
            <p className="font-semibold text-amber-300">⚠️ خطوة هامة في صفحة Bot:</p>
            <p>فعّل خيار <strong>Message Content Intent</strong> ليتمكن البوت من قراءة إجابات اللاعبين!</p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-sm border border-purple-500/30">
            2
          </div>
          <h3 className="font-bold text-white text-base">ضبط متغيرات البيئة</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            انسخ ملف <code className="text-purple-300">.env.example</code> إلى <code className="text-purple-300">.env</code> وأدخل توكن البوت ومعرف التطبيق.
          </p>
          <div className="relative bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <button
              onClick={() => copyToClipboard(envSample, 'env')}
              className="absolute top-2 left-2 p-1.5 rounded-md bg-slate-800 text-slate-300 hover:text-white text-[10px] flex items-center gap-1"
            >
              {copiedKey === 'env' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>نسخ</span>
            </button>
            <pre className="text-[10px] text-slate-400 font-mono overflow-x-auto pt-5 text-left" dir="ltr">
              {envSample}
            </pre>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/30">
            3
          </div>
          <h3 className="font-bold text-white text-base">التشغيل المباشر</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            شغل الأوامر في الطرفية للتشغيل المحلي أو الاستضافة الخارجية:
          </p>
          <div className="space-y-2 text-[11px] font-mono text-left" dir="ltr">
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-300 flex justify-between items-center">
              <code>npm run deploy-commands</code>
              <button onClick={() => copyToClipboard('npm run deploy-commands', 'c1')} className="text-slate-500 hover:text-slate-300">
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-emerald-400 flex justify-between items-center">
              <code>npm run bot</code>
              <button onClick={() => copyToClipboard('npm run bot', 'c2')} className="text-slate-500 hover:text-slate-300">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Hosting & PM2 Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Server className="w-5 h-5 text-amber-400" />
          الاستضافة والتشغيل المستمر 24/7 (VPS / Dedicated Server)
        </h3>
        <p className="text-xs text-slate-400">
          لتشغيل البوت على مدار الساعة خارج Google AI Studio باستخدام <strong>PM2</strong>:
        </p>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-2 text-left" dir="ltr">
          <p className="text-slate-500"># 1. Install PM2 process manager</p>
          <p className="text-indigo-400">npm install -g pm2</p>
          <p className="text-slate-500 pt-2"># 2. Launch Ja'far bot process</p>
          <p className="text-emerald-400">pm2 start src/index.js --name "jafar-bot"</p>
          <p className="text-slate-500 pt-2"># 3. Save auto-restart configuration on server reboot</p>
          <p className="text-amber-400">pm2 save && pm2 startup</p>
        </div>
      </div>

    </div>
  );
};

export default SetupGuide;
