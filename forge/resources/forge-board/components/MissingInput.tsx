import React, { useState } from "react";

interface MissingInputProps {
  onSubmit: (text: string) => void;
  isPending?: boolean;
  placeholder?: string;
}

export const MissingInput: React.FC<MissingInputProps> = ({ onSubmit, isPending, placeholder }) => {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  };

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder={placeholder ?? "What am I missing? Add a consideration..."}
        disabled={isPending}
        style={{
          flex: 1,
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          fontSize: 13,
          fontFamily: "system-ui, sans-serif",
          outline: "none",
          background: "#ffffff",
          color: "#1e293b",
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={isPending || !value.trim()}
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          border: "none",
          background: isPending ? "#cbd5e1" : "#0F172A",
          color: "#ffffff",
          fontSize: 18,
          fontWeight: 700,
          cursor: isPending ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        +
      </button>
    </div>
  );
};
