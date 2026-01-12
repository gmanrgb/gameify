import { useState, useRef } from 'react';
import { useStore } from '../store';
import { api } from '../api/client';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import type { Theme } from '@questlog/shared';

const THEMES: { id: Theme; name: string; colors: string[] }[] = [
  { id: 'aurora', name: 'Aurora', colors: ['#667eea', '#764ba2'] },
  { id: 'sunset', name: 'Sunset', colors: ['#f093fb', '#f5576c'] },
  { id: 'ocean', name: 'Ocean', colors: ['#4facfe', '#00f2fe'] },
  { id: 'midnight', name: 'Midnight', colors: ['#a8edea', '#fed6e3'] },
];

export function Settings() {
  const { theme, profile, updateTheme, updateAccent, showToast, loadProfile } = useStore();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    api.exportBackup();
    showToast('success', 'Backup downloaded!');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await api.importBackup(file);
      showToast('success', 'Data restored successfully!');
      loadProfile();
      window.location.reload();
    } catch (error) {
      showToast('error', 'Failed to import backup');
    }
    
    // Reset file input
    e.target.value = '';
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await api.resetData();
      showToast('info', 'All data has been reset');
      setIsResetModalOpen(false);
      loadProfile();
      window.location.reload();
    } catch (error) {
      showToast('error', 'Failed to reset data');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <h1 className="text-2xl font-bold font-display gradient-text mb-6">Settings</h1>

      {/* Theme Selection */}
      <Card className="mb-6">
        <CardHeader>
          <h3 className="font-semibold text-text-primary">Theme</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-4">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => updateTheme(t.id)}
                className={`
                  p-4 rounded-xl border-2 transition-all
                  ${theme === t.id 
                    ? 'border-white scale-[1.02]' 
                    : 'border-white/10 hover:border-white/30'
                  }
                `}
                style={{
                  background: `linear-gradient(135deg, ${t.colors[0]}20 0%, ${t.colors[1]}20 100%)`,
                }}
              >
                <div
                  className="w-full h-2 rounded-full mb-3"
                  style={{
                    background: `linear-gradient(90deg, ${t.colors[0]}, ${t.colors[1]})`,
                  }}
                />
                <p className="font-medium text-text-primary">{t.name}</p>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Accent Color */}
      <Card className="mb-6">
        <CardHeader>
          <h3 className="font-semibold text-text-primary">Accent Color</h3>
        </CardHeader>
        <CardBody>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={profile?.accent || '#7C3AED'}
              onChange={(e) => updateAccent(e.target.value)}
              className="w-12 h-12 rounded-lg cursor-pointer border-0"
            />
            <input
              type="text"
              value={profile?.accent || '#7C3AED'}
              onChange={(e) => updateAccent(e.target.value)}
              className="flex-1 px-4 py-2 bg-bg-tertiary border border-white/10 rounded-lg text-text-primary font-mono"
              pattern="^#[0-9A-Fa-f]{6}$"
            />
          </div>
        </CardBody>
      </Card>

      {/* Profile Stats */}
      {profile && (
        <Card className="mb-6">
          <CardHeader>
            <h3 className="font-semibold text-text-primary">Your Stats</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold gradient-text">{profile.level}</p>
                <p className="text-sm text-text-secondary">Level</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-400">{profile.xpTotal.toLocaleString()}</p>
                <p className="text-sm text-text-secondary">Total XP</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-yellow-400">{profile.perfectDays}</p>
                <p className="text-sm text-text-secondary">Perfect Days</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Data Management */}
      <Card className="mb-6">
        <CardHeader>
          <h3 className="font-semibold text-text-primary">Data Management</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="secondary" onClick={handleExport} className="flex-1">
              📥 Export Backup
            </Button>
            <Button variant="secondary" onClick={handleImportClick} className="flex-1">
              📤 Import Backup
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
          <p className="text-sm text-text-secondary">
            Export your data as a JSON file or restore from a previous backup.
          </p>
        </CardBody>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/30">
        <CardHeader className="border-b-red-500/20">
          <h3 className="font-semibold text-red-400">Danger Zone</h3>
        </CardHeader>
        <CardBody>
          <p className="text-text-secondary mb-4">
            This will permanently delete all your data including goals, tasks, check-ins, and badges.
            This action cannot be undone.
          </p>
          <Button variant="danger" onClick={() => setIsResetModalOpen(true)}>
            🗑️ Reset All Data
          </Button>
        </CardBody>
      </Card>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="⚠️ Confirm Reset"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsResetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={isResetting} onClick={handleReset}>
              Yes, Reset Everything
            </Button>
          </>
        }
      >
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-text-primary mb-4">
            Are you absolutely sure you want to delete all your data?
          </p>
          <p className="text-text-secondary text-sm">
            This will permanently remove:
          </p>
          <ul className="text-text-secondary text-sm mt-2 space-y-1">
            <li>• All goals and tasks</li>
            <li>• All check-ins and streaks</li>
            <li>• All XP and levels</li>
            <li>• All unlocked badges</li>
          </ul>
        </div>
      </Modal>

      {/* Version Footer */}
      <div className="text-center mt-8 pb-8">
        <p className="text-text-secondary text-sm">
          QuestLog v1.0.0
        </p>
        <p className="text-text-secondary/50 text-xs mt-1">
          Built with ❤️ for goal achievers
        </p>
      </div>
    </div>
  );
}
