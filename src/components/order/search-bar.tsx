'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import Fuse from 'fuse.js';
import type { Customer } from '@prisma/client';

interface SearchBarProps {
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  recentCustomerIds: string[];
}

export function SearchBar({ customers, onSelect, recentCustomerIds }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Build recent customers list from IDs
  const recentCustomers = recentCustomerIds
    .map((id) => customers.find((c) => c.id === id))
    .filter(Boolean) as Customer[];

  // Fuse instance
  const fuse = useMemo(
    () =>
      new Fuse(customers, {
        keys: ['name', 'phone', 'code'],
        threshold: 0.3,
        includeScore: true,
      }),
    [customers]
  );

  // Get displayed results
  const results = query.trim()
    ? fuse.search(query).map((r) => r.item)
    : recentCustomers;

  // Auto-select hint when exactly 1 result
  const singleResultHint =
    results.length === 1 ? `Enter để chọn "${results[0].name}"` : null;

  // Compute isOpen from derived state
  const isOpen = isFocused || Boolean(query.trim()) || results.length > 0;

  // Handle selection
  const handleSelect = useCallback(
    (customer: Customer) => {
      onSelect(customer);
      setQuery('');
      setSelectedIndex(0);
      setIsFocused(false);
      inputRef.current?.blur();
    },
    [onSelect]
  );

  // Handle focus/blur
  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  // Handle selection reset when query changes
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedIndex(0);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen && e.key !== 'Enter') return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        } else if (singleResultHint) {
          handleSelect(results[0]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setQuery('');
        setSelectedIndex(0);
        setIsFocused(false);
        inputRef.current?.blur();
        break;
    }
  }, [isOpen, results, selectedIndex, handleSelect, singleResultHint]);

  return (
    <div className="relative">
      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Tìm khách hàng (tên, mã, SĐT)..."
          className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-2 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        />
        {/* Search icon */}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </span>
      </div>

      {/* Single result hint */}
      {singleResultHint && (
        <div className="mt-1 text-xs text-blue-400">{singleResultHint}</div>
      )}

      {/* Dropdown results */}
      {isOpen && (results.length > 0 || !query.trim()) && (
        <ul
          ref={listRef}
          className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-white/10 bg-slate-800 py-1 shadow-lg"
          role="listbox"
        >
          {!query.trim() && recentCustomers.length > 0 && (
            <li className="px-3 py-1 text-xs font-medium text-slate-400">
              Khách hàng gần đây
            </li>
          )}
          {results.map((customer, idx) => (
            <li
              key={customer.id}
              className={`cursor-pointer px-3 py-2 hover:bg-white/10 ${
                idx === selectedIndex ? 'bg-white/10' : ''
              }`}
              onClick={() => handleSelect(customer)}
              onMouseEnter={() => setSelectedIndex(idx)}
              role="option"
              aria-selected={idx === selectedIndex}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-white">{customer.name}</span>
                  <span className="ml-2 rounded bg-slate-700 px-1.5 py-0.5 font-mono text-xs text-slate-300">
                    {customer.code}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-400">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.036 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  {customer.phone}
                </div>
              </div>
            </li>
          ))}
          {results.length === 0 && query.trim() && (
            <li className="px-3 py-2 text-sm text-slate-500">Không tìm thấy khách hàng</li>
          )}
        </ul>
      )}
    </div>
  );
}
