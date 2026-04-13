import { useState, useEffect } from "react";

interface NumberInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
}

export default function NumberInput({ value, onChange, className, placeholder }: NumberInputProps) {
  const [displayValue, setDisplayValue] = useState(value === 0 ? "" : value.toLocaleString());

  useEffect(() => {
    setDisplayValue(value === 0 ? "" : value.toLocaleString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, "");
    if (rawValue === "" || !isNaN(Number(rawValue))) {
      const numValue = rawValue === "" ? 0 : Number(rawValue);
      setDisplayValue(rawValue === "" ? "" : Number(rawValue).toLocaleString());
      onChange(numValue);
    }
  };

  return (
    <input
      type="text"
      className={className}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      inputMode="numeric"
    />
  );
}
