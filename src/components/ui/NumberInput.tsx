import { useState } from "react";

interface NumberInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
}

export default function NumberInput({ value, onChange, className, placeholder }: NumberInputProps) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");

  // フォーカス時：カンマなしの生数字を編集モードで表示
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const strVal = value === 0 ? "" : String(value);
    setRaw(strVal);
    setEditing(true);
    // 全選択で上書き入力しやすくする
    e.currentTarget.select();
  };

  // 離脱時：フォーマット表示に戻す
  const handleBlur = () => {
    setEditing(false);
  };

  // 入力中：数字以外を除去して即時反映
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^\d]/g, "");
    setRaw(digits);
    onChange(digits === "" ? 0 : Number(digits));
  };

  // Enter: 次のinputへ移動
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
      const all = Array.from(
        document.querySelectorAll<HTMLInputElement>('input[inputmode="numeric"]')
      );
      const idx = all.indexOf(e.currentTarget);
      if (idx >= 0 && idx < all.length - 1) {
        all[idx + 1].focus();
        all[idx + 1].select();
      }
    }
  };

  const display = editing ? raw : value === 0 ? "" : value.toLocaleString();

  return (
    <input
      type="text"
      className={className}
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder ?? "0"}
      inputMode="numeric"
    />
  );
}
