interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  disabled?: boolean;
  "aria-label"?: string;
}

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  onCommit,
  disabled,
  ...rest
}: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      aria-label={rest["aria-label"]}
      onChange={(e) => onChange(Number(e.target.value))}
      onMouseUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
      onTouchEnd={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
      onKeyUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
      className="hd-slider h-2 w-full cursor-pointer appearance-none rounded-full disabled:opacity-50"
      style={{
        background: `linear-gradient(to right, rgb(var(--ink)) ${pct}%, rgb(var(--border)) ${pct}%)`,
      }}
    />
  );
}
