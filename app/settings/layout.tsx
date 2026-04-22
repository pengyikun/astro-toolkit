import SettingsSidebar from '@/components/layout/SettingsSidebar';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="settings-zone">
      <SettingsSidebar />
      {children}
    </div>
  );
}
