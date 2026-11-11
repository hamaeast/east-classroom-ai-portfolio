import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

const PALETTES = [
  ['current', 'Current'], ['cobalt-violet', 'Blue + violet'],
  ['emerald-gold', 'Emerald + gold'], ['crimson-cyan', 'Crimson + cyan'],
  ['teal-coral', 'Teal + coral'], ['ice-amber', 'Ice + amber'],
  ['purple-lime', 'Purple + lime'], ['sunset-indigo', 'Sunset + indigo'],
  ['ocean-mint', 'Ocean + mint'], ['ruby-gold', 'Ruby + gold'],
  ['midnight-rose', 'Midnight + rose'],
  ['sky-coral-light', 'Sky + coral · light'], ['sage-gold-light', 'Sage + gold · light'],
  ['lavender-blue-light', 'Lavender + blue · light'], ['sand-teal-light', 'Sand + teal · light'],
  ['navy-copper', 'Navy + copper'], ['forest-orchid', 'Forest + orchid'],
  ['charcoal-aqua', 'Charcoal + aqua'], ['plum-amber', 'Plum + amber'],
  ['solar-blue', 'Solar yellow + orange'], ['hot-pink-teal', 'Hot pink + teal'],
];

export default function ColorPalettePreview() {
  const { user, updateCurrentUser } = useAuth();
  const [palette, setPalette] = useState(user?.theme_palette || 'current');
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const savedPalette = user?.theme_palette || 'current';
    setPalette(savedPalette);
    document.documentElement.dataset.colorPalette = savedPalette;
  }, [user?.theme_palette]);

  const choosePalette = async (nextPalette) => {
    const previousPalette = palette;
    setPalette(nextPalette);
    setSaving(nextPalette);
    setError('');
    document.documentElement.dataset.colorPalette = nextPalette;
    try {
      await updateCurrentUser({ theme_palette: nextPalette });
    } catch {
      setPalette(previousPalette);
      document.documentElement.dataset.colorPalette = previousPalette;
      setError('Theme could not be saved. Please try again.');
    } finally {
      setSaving('');
    }
  };

  return <div>
    <p className="mb-4 text-sm text-muted-foreground">Select a palette to preview and save it.</p>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {PALETTES.map(([id, label]) => <button key={id} type="button" disabled={Boolean(saving)} onClick={() => choosePalette(id)} className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-semibold disabled:opacity-60 ${palette === id ? 'border-neon-cyan bg-neon-cyan/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}>
        <span className={`palette-swatch palette-swatch-${id}`} />
        <span>{label}{saving === id && <span className="ml-2 text-xs font-normal">Saving…</span>}</span>
      </button>)}
    </div>
    {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
  </div>;
}