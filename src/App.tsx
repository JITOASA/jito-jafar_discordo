/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Header from './components/Header.tsx';
import DiscordGameSimulator from './components/DiscordGameSimulator.tsx';
import GamesRegistryView from './components/GamesRegistryView.tsx';
import LeaderboardView from './components/LeaderboardView.tsx';
import ConfigPanel from './components/ConfigPanel.tsx';
import SetupGuide from './components/SetupGuide.tsx';
import { BotStatus } from './types.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'registry' | 'leaderboard' | 'config' | 'guide'>('simulator');
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/bot/status');
      const data = await res.json();
      setBotStatus(data);
    } catch (err) {
      console.error('Failed to load bot status', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" dir="rtl">
      
      {/* Top Header */}
      <Header
        status={botStatus}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'simulator' && (
          <DiscordGameSimulator onWinRecorded={fetchStatus} />
        )}

        {activeTab === 'registry' && (
          <GamesRegistryView />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView />
        )}

        {activeTab === 'config' && (
          <ConfigPanel />
        )}

        {activeTab === 'guide' && (
          <SetupGuide />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            بوت <strong>جعفر</strong> للألعاب العربية المصغرة • مبني بـ Node.js & discord.js
          </p>
          <p className="font-mono text-[11px] text-slate-600">
            العاب: اعكس 🔄 • أعلام 🚩 • نظام نقاط محلي
          </p>
        </div>
      </footer>

    </div>
  );
}
