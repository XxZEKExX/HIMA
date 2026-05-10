import { useState } from "react";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date" | "time";
  disabled?: boolean;
  placeholder?: string;
}

export function FormField({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  placeholder = "",
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== "";

  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full h-14 px-4 pt-5 pb-2 rounded-lg border border-border bg-input-background
          focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
          disabled:bg-muted disabled:text-muted-foreground transition-all`}
      />
      <label
        className={`absolute left-4 transition-all pointer-events-none text-muted-foreground
          ${
            isFocused || hasValue
              ? "top-2 text-[11px]"
              : "top-1/2 -translate-y-1/2 text-sm"
          }`}
        style={{ fontWeight: isFocused || hasValue ? 600 : 400 }}
      >
        {label}
      </label>
    </div>
  );
}