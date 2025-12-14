'use client';

import React, { useState } from 'react';

interface MobileSettingsProps {
  onThemeChange?: (theme: 'dark' | 'light') => void;
  onNotificationsChange?: (enabled: boolean) => void;
  onSoundChange?: (enabled: boolean) => void;
}

export default function MobileSettings({
  onThemeChange: _onThemeChange,
  onNotificationsChange,
  onSoundChange
}: MobileSettingsProps) {
  // Theme change reserved for future use
  void _onThemeChange;
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);
  const [showChartLines, setShowChartLines] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  const handleNotificationsChange = (enabled: boolean) => {
    setNotifications(enabled);
    onNotificationsChange?.(enabled);
  };

  const handleSoundChange = (enabled: boolean) => {
    setSound(enabled);
    onSoundChange?.(enabled);
  };

  return (
    <div className="space-y-4">
      {/* Chart Settings */}
      <div className="bg-[#21262D] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#30363D]">
          <h3 className="text-white font-medium">Chart Settings</h3>
        </div>
        <div className="p-4 space-y-4">
          <ToggleSetting
            label="Show Trading Levels"
            description="Entry, SL, TP lines"
            enabled={showChartLines}
            onChange={setShowChartLines}
          />
          <ToggleSetting
            label="Show Volume"
            description="Volume bars below chart"
            enabled={showVolume}
            onChange={setShowVolume}
          />
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-[#21262D] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#30363D]">
          <h3 className="text-white font-medium">Notifications</h3>
        </div>
        <div className="p-4 space-y-4">
          <ToggleSetting
            label="Push Notifications"
            description="Signal alerts"
            enabled={notifications}
            onChange={handleNotificationsChange}
          />
          <ToggleSetting
            label="Sound"
            description="Audio alerts"
            enabled={sound}
            onChange={handleSoundChange}
          />
        </div>
      </div>

      {/* About */}
      <div className="bg-[#21262D] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#30363D]">
          <h3 className="text-white font-medium">About</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Version</span>
            <span className="text-white">1.0.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Build</span>
            <span className="text-white">2024.12.14</span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-[#21262D] rounded-xl overflow-hidden border border-red-900/50">
        <div className="px-4 py-3 border-b border-red-900/50">
          <h3 className="text-red-400 font-medium">Danger Zone</h3>
        </div>
        <div className="p-4">
          <button className="w-full py-3 rounded-lg bg-red-900/30 text-red-400 font-medium
                           active:bg-red-900/50 transition-colors min-h-[48px]">
            Reset All Settings
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleSetting({ 
  label, 
  description, 
  enabled, 
  onChange 
}: { 
  label: string; 
  description: string; 
  enabled: boolean; 
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-gray-300 text-sm">{label}</div>
        <div className="text-gray-500 text-xs">{description}</div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-7 rounded-full transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-[#30363D]'
        }`}
      >
        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white 
                         transition-transform ${enabled ? 'left-5' : 'left-0.5'}`} 
        />
      </button>
    </div>
  );
}
