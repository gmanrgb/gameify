import { useState } from 'react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

const PRESET_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#F59E0B', // amber
  '#EAB308', // yellow
  '#84CC16', // lime
  '#22C55E', // green
  '#10B981', // emerald
  '#14B8A6', // teal
  '#06B6D4', // cyan
  '#0EA5E9', // sky
  '#3B82F6', // blue
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#A855F7', // purple
  '#D946EF', // fuchsia
  '#EC4899', // pink
];

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`
              w-8 h-8 rounded-lg border-2 transition-all
              ${value === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}
            `}
            style={{ backgroundColor: color }}
            aria-label={`Select color ${color}`}
          />
        ))}
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className={`
            w-8 h-8 rounded-lg border-2 flex items-center justify-center
            bg-gradient-to-br from-red-500 via-green-500 to-blue-500
            ${showCustom ? 'border-white' : 'border-transparent hover:border-white/50'}
          `}
          aria-label="Custom color"
        >
          <span className="text-white text-xs font-bold">+</span>
        </button>
      </div>
      {showCustom && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            pattern="^#[0-9A-Fa-f]{6}$"
            className="flex-1 px-3 py-2 bg-bg-tertiary border border-white/10 rounded-lg text-text-primary font-mono text-sm"
            placeholder="#000000"
          />
        </div>
      )}
    </div>
  );
}
