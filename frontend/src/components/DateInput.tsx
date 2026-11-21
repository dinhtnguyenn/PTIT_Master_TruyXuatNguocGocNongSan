'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

export function isoToDateDisplay(iso: string): string {
  if (!iso) return '';
  const clean = iso.trim().split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    if (y && m && d) return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return iso;
}

export function displayToIsoDate(display: string): string | null {
  if (!display || !display.trim()) return '';
  const parts = display.trim().split('/');
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    if (
      !isNaN(d) &&
      !isNaN(m) &&
      !isNaN(y) &&
      d >= 1 &&
      d <= 31 &&
      m >= 1 &&
      m <= 12 &&
      parts[2].trim().length === 4 &&
      y >= 1900 &&
      y <= 2100
    ) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  return null;
}

function formatInputDate(value: string, prevValue: string): string {
  if (value.length < prevValue.length) {
    return value;
  }
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  } else if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  } else {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }
}

interface DateInputProps {
  value: string; // ISO 'YYYY-MM-DD'
  onChange: (isoValue: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

export function DateInput({
  value,
  onChange,
  placeholder = 'dd/mm/yyyy',
  required,
  disabled,
  className = '',
  id,
  name,
}: DateInputProps) {
  const [displayText, setDisplayText] = useState<string>(() => isoToDateDisplay(value));
  const nativePickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayText(isoToDateDisplay(value));
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatInputDate(e.target.value, displayText);
    setDisplayText(formatted);

    const iso = displayToIsoDate(formatted);
    if (iso !== null) {
      onChange(iso);
    } else if (formatted === '') {
      onChange('');
    }
  };

  const handleBlur = () => {
    if (displayText && displayToIsoDate(displayText) === null) {
      setDisplayText(isoToDateDisplay(value));
    }
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoVal = e.target.value;
    onChange(isoVal);
    setDisplayText(isoToDateDisplay(isoVal));
  };

  const triggerPicker = () => {
    if (disabled) return;
    try {
      if (nativePickerRef.current && typeof nativePickerRef.current.showPicker === 'function') {
        nativePickerRef.current.showPicker();
      } else {
        nativePickerRef.current?.focus();
        nativePickerRef.current?.click();
      }
    } catch {
      nativePickerRef.current?.focus();
    }
  };

  return (
    <div className="relative flex items-center w-full group">
      <input
        type="text"
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        value={displayText}
        onChange={handleTextChange}
        onBlur={handleBlur}
        className={`${className} pr-9`}
      />
      <div className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-pointer">
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={triggerPicker}
          className="p-1 text-slate-400 group-hover:text-slate-600 transition cursor-pointer"
          title="Chọn ngày từ lịch"
        >
          <Calendar className="w-4 h-4" />
        </button>
        {/* Invisible native date picker over icon */}
        <input
          ref={nativePickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={value || ''}
          onChange={handlePickerChange}
          disabled={disabled}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
    </div>
  );
}

export function isoToDateTimeDisplay(iso: string): string {
  if (!iso) return '';
  if (iso.includes('T')) {
    const [d, t] = iso.split('T');
    const dateStr = isoToDateDisplay(d);
    const timeStr = (t || '').slice(0, 5);
    return `${dateStr} ${timeStr}`.trim();
  }
  return isoToDateDisplay(iso);
}

export function displayToIsoDateTime(display: string): string | null {
  if (!display || !display.trim()) return '';
  const parts = display.trim().split(/\s+/);
  if (parts.length >= 2) {
    const isoDate = displayToIsoDate(parts[0]);
    const timePart = parts[1];
    if (isoDate && /^\d{1,2}:\d{2}$/.test(timePart)) {
      const [h, m] = timePart.split(':');
      return `${isoDate}T${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    }
  }
  return null;
}

interface DateTimeInputProps {
  value: string; // ISO 'YYYY-MM-DDTHH:mm'
  onChange: (isoValue: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

export function DateTimeInput({
  value,
  onChange,
  placeholder = 'dd/mm/yyyy --:--',
  required,
  disabled,
  className = '',
  id,
  name,
}: DateTimeInputProps) {
  const [displayText, setDisplayText] = useState<string>(() => isoToDateTimeDisplay(value));
  const nativePickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayText(isoToDateTimeDisplay(value));
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDisplayText(val);

    const iso = displayToIsoDateTime(val);
    if (iso !== null) {
      onChange(iso);
    } else if (val === '') {
      onChange('');
    }
  };

  const handleBlur = () => {
    if (displayText && displayToIsoDateTime(displayText) === null) {
      setDisplayText(isoToDateTimeDisplay(value));
    }
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoVal = e.target.value;
    onChange(isoVal);
    setDisplayText(isoToDateTimeDisplay(isoVal));
  };

  const triggerPicker = () => {
    if (disabled) return;
    try {
      if (nativePickerRef.current && typeof nativePickerRef.current.showPicker === 'function') {
        nativePickerRef.current.showPicker();
      } else {
        nativePickerRef.current?.focus();
        nativePickerRef.current?.click();
      }
    } catch {
      nativePickerRef.current?.focus();
    }
  };

  return (
    <div className="relative flex items-center w-full group">
      <input
        type="text"
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        value={displayText}
        onChange={handleTextChange}
        onBlur={handleBlur}
        className={`${className} pr-9`}
      />
      <div className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-pointer">
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={triggerPicker}
          className="p-1 text-slate-400 group-hover:text-slate-600 transition cursor-pointer"
          title="Chọn ngày giờ"
        >
          <Calendar className="w-4 h-4" />
        </button>
        {/* Invisible native datetime picker over icon */}
        <input
          ref={nativePickerRef}
          type="datetime-local"
          tabIndex={-1}
          aria-hidden="true"
          value={value || ''}
          onChange={handlePickerChange}
          disabled={disabled}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
    </div>
  );
}
