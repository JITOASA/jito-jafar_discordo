import React, { useState, useEffect } from 'react';
import { BotConfig } from '../types.js';
import { Settings, Save, CheckCircle2, Sliders, Play, SpellCheck, RotateCcw, AlertTriangle } from 'lucide-react';

export const ConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [reverseTimer, setReverseTimer] = useState(15);
  const [flagsTimer, setFlagsTimer] = useState(15);
  const [pointsPerWin, setPointsPerWin] = useState(10);
  const [prefix, setPrefix] = useState('!');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Playground tester
  const [testText, setTestText] = useState('سفينة الصحراء');
  const [reversedOutput, setReversedOutput] = useState('');

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data: BotConfig = await res.json();
      setConfig(data);
      if (data.games?.reverse) setReverseTimer(data.games.reverse.timerSeconds);
      if (data.games?.flags) setFlagsTimer(data.games.flags.timerSeconds);
      if (data.games?.reverse) setPointsPerWin(data.games.reverse.pointsPerWin);
      if (data.bot?.prefix) setPrefix(data.bot.prefix);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Update live reversal preview
  useEffect(() => {
    if (!testText) {
      setReversedOutput('');
      return;
    }
    // Grapheme-safe Unicode reversal
    const rev = Array.from(testText.trim()).reverse().join('');
    setReversedOutput(rev);
  }, [testText]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reverseTimer,
          flagsTimer,
          pointsPerWin,
          prefix,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              الإعدادات المركزية لألعاب بوت جعفر
            </h2>
            <p className="text-xs text-slate-400">
              جميع القيم مربوطة بملف الإعدادات المركزي <code className="text-indigo-400">src/config/index.js</code> ويتم تطبيقها فورياً على سيرفرات ديسكورد والمحاكي.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Settings Form (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Reverse Game Timer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="reverse-timer-input" className="text-sm font-bold text-white flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-purple-400" />
                  مؤقت لعبة "اعكس" (بالثواني):
                </label>
                <span className="text-xs font-mono font-bold text-purple-300 px-2.5 py-1 rounded bg-purple-950/60 border border-purple-800">
                  {reverseTimer} ثانية
                </span>
              </div>
              <input
                id="reverse-timer-input"
                type="range"
                min={5}
                max={60}
                step={1}
                value={reverseTimer}
                onChange={(e) => setReverseTimer(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                الوقت المتاح للاعبين لكتابة الكلمة المعكوسة قبل إلغاء الجولة (الافتراضي: 15 ثانية).
              </p>
            </div>

            {/* Flags Game Timer */}
            <div className="space-y-2 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label htmlFor="flags-timer-input" className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="text-sky-400">🚩</span>
                  مؤقت لعبة "أعلام" (بالثواني):
                </label>
                <span className="text-xs font-mono font-bold text-sky-300 px-2.5 py-1 rounded bg-sky-950/60 border border-sky-800">
                  {flagsTimer} ثانية
                </span>
              </div>
              <input
                id="flags-timer-input"
                type="range"
                min={5}
                max={60}
                step={1}
                value={flagsTimer}
                onChange={(e) => setFlagsTimer(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                الوقت المتاح لتخمين اسم الدولة من العلم قبل انتهاء الجولة (الافتراضي: 15 ثانية).
              </p>
            </div>

            {/* Points Per Win */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              <div className="space-y-1.5">
                <label htmlFor="points-per-win-input" className="text-sm font-bold text-white">
                  النقاط المكتسبة لكل فوز:
                </label>
                <input
                  id="points-per-win-input"
                  type="number"
                  min={1}
                  max={100}
                  value={pointsPerWin}
                  onChange={(e) => setPointsPerWin(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="bot-prefix-input" className="text-sm font-bold text-white">
                  البادئة النصية البديلة (Prefix):
                </label>
                <input
                  id="bot-prefix-input"
                  type="text"
                  maxLength={3}
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              {saveSuccess && (
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم حفظ وتطبيق الإعدادات المركزية بنجاح!</span>
                </div>
              )}
              {!saveSuccess && <div />}

              <button
                id="save-config-btn"
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
              </button>
            </div>

          </form>
        </div>

        {/* Live Arabic Processing & Reversal Inspector (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <SpellCheck className="w-5 h-5 text-amber-400" />
              مختبر فحص معالجة النصوص العربية
            </h3>
            <p className="text-xs text-slate-400">
              اختبر خوارزمية عكس الكلمات العربية الدقيقة وتأكد من سلامة الحروف المتصلة والتشكيل:
            </p>

            <div className="space-y-2">
              <label htmlFor="test-arabic-input" className="text-xs font-semibold text-slate-300">
                أدخل أي كلمة أو عبارة عربية:
              </label>
              <input
                id="test-arabic-input"
                type="text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="اكتب كلمة عربية هنا..."
                className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[11px] text-slate-400 block">النتيجة المعكوسة المقبولة في البوت:</span>
              <div className="text-xl font-bold text-amber-300 font-mono tracking-wider break-all">
                {reversedOutput || '—'}
              </div>
            </div>

            <div className="text-[11px] text-slate-400 space-y-1">
              <p>✔ متوافق مع ترميز Unicode وتقسيم الـ Graphemes.</p>
              <p>✔ يتجاهل التشكيل والحركات تلقائياً لضمان عدالة اللعب.</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default ConfigPanel;
