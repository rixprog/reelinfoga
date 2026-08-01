import { Settings } from '@/components/Settings';
import { Page } from '@/components/Shell';

export default function SettingsPage() {
  return (
    <Page title="Settings" subtitle="Notifications and reminders.">
      <Settings />
    </Page>
  );
}
