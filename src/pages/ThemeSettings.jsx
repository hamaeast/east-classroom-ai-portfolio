import ColorPalettePreview from '@/components/east/ColorPalettePreview';
import PageHeader from '@/components/east/PageHeader';

export default function ThemeSettings() {
  return <div>
    <PageHeader eyebrow="Appearance" title="Change theme" description="Choose the color palette for your account. Your selection stays with you on future logins." />
    <section className="glass-panel mt-6 rounded-xl p-5 sm:p-7">
      <ColorPalettePreview />
    </section>
  </div>;
}