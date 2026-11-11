import { base44 } from '@/api/base44Client';
import useEntityList from '@/hooks/useEntityList';

const KEY = 'standards_assessment_enabled';
export default function StandardsAvailabilityControl() {
  const { items, reload } = useEntityList('AppSetting');
  const setting = items.find(item => item.key === KEY), enabled = !!setting?.enabled;
  const toggle = async () => {
    if (setting) await base44.entities.AppSetting.update(setting.id, { enabled: !enabled });
    else await base44.entities.AppSetting.create({ key: KEY, enabled: true });
    reload();
  };
  return <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-5 shadow-sm">
    <div><h3 className="font-semibold">Student standards assessment</h3><p className="text-sm text-muted-foreground">{enabled ? 'Students can generate or refresh their assessment.' : 'Student assessment buttons are turned off.'}</p></div>
    <button onClick={toggle} className={enabled ? 'east-button' : 'rounded-lg border px-4 py-2 text-sm font-semibold'}>{enabled ? 'Turn off for everyone' : 'Turn on for everyone'}</button>
  </div>;
}