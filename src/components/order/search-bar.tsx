'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import Fuse from 'fuse.js';
import { Search, Phone, Users } from 'lucide-react';
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

  // Fuse instance
  const fuse = useMemo(
    () =>
      new Fuse(customers, {
        keys: ['name', 'phone', 'code', 'address'],
        threshold: 0.35,
        includeScore: true,
      }),
    [customers]
  );

  // When query is empty: show all customers (with recent customers prioritized first)
  const allOrderedCustomers = useMemo(() => {
    if (recentCustomerIds.length === 0) return customers;
    const recentSet = new Set(recentCustomerIds);
    const recent = recentCustomerIds
      .map((id) => customers.find((c) => c.id === id))
      .filter(Boolean) as Customer[];
    const others = customers.filter((c) => !recentSet.has(c.id));
    return [...recent, ...others];
  }, [customers, recentCustomerIds]);

  // Get displayed results
  const results = useMemo(() => {
    if (query.trim()) {
      return fuse.search(query).map((r) => r.item);
    }
    return allOrderedCustomers;
  }, [query, fuse, allOrderedCustomers]);

  // Auto-select hint when exactly 1 result during search
  const singleResultHint =
    query.trim() && results.length === 1
      ? `Nhấn Enter để chọn nhanh "${results[0].name}"`
      : null;

  // Keep dropdown open when focused or when query exists
  const isOpen = isFocused || Boolean(query.trim());

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
  const handleBlur = useCallback(() => {
    // Delay blur to allow item click
    setTimeout(() => setIsFocused(false), 200);
  }, []);

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
        } else if (singleResultHint && results[0]) {
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
          placeholder="Tìm khách hàng (tên, mã, SĐT, địa chỉ)..."
          className="w-full rounded border border-outline-variant bg-card px-3.5 py-2.5 pr-10 text-sm text-on-surface placeholder:text-faint focus:border-[#004a99] focus:outline-none focus:ring-1 focus:ring-[#004a99] transition-all shadow-2xs"
        />
        {/* Search icon */}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint">
          <Search className="h-4 w-4" />
        </span>
      </div>

      {/* Single result hint */}
      {singleResultHint && (
        <div className="mt-1 text-xs font-bold text-primary-accent">{singleResultHint}</div>
      )}

      {/* Dropdown results */}
      {isOpen && (
        <ul
          ref={listRef}
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded border border-outline-variant bg-card py-1 shadow-xl divide-y divide-outline-soft"
          role="listbox"
        >
          {/* Header */}
          <li className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant bg-surface flex items-center justify-between sticky top-0 z-10">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary-accent" />
              {query.trim() ? `Kết quả tìm kiếm (${results.length})` : `Tất cả khách hàng (${results.length})`}
            </span>
            <span className="text-[10px] text-faint font-normal lowercase">Dùng phím mũi tên & Enter</span>
          </li>

          {results.map((customer, idx) => {
            const isRecent = !query.trim() && recentCustomerIds.includes(customer.id);
            return (
              <li
                key={customer.id}
                className={`cursor-pointer px-3.5 py-2.5 transition-colors ${
                  idx === selectedIndex ? 'bg-container-high' : 'hover:bg-container-low'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(customer);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                role="option"
                aria-selected={idx === selectedIndex}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-on-surface">{customer.name}</span>
                      <span className="rounded bg-container-high px-1.5 py-0.2 font-mono text-[11px] font-bold text-primary-accent">
                        {customer.code}
                      </span>
                      {isRecent && (
                        <span className="rounded bg-[#a0f399]/40 px-1.5 py-0.2 text-[10px] font-bold text-secondary">
                          Vừa gọi
                        </span>
                      )}
                    </div>
                    {customer.address && (
                      <p className="text-xs text-faint truncate mt-0.5">{customer.address}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-on-surface-variant font-mono shrink-0">
                    <Phone className="h-3.5 w-3.5 text-primary-accent" />
                    {customer.phone}
                  </div>
                </div>
              </li>
            );
          })}

          {results.length === 0 && (
            <li className="px-3.5 py-4 text-xs text-faint text-center">
              {query.trim() ? `Không tìm thấy khách hàng nào khớp với "${query}"` : 'Chưa có khách hàng nào trong hệ thống'}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
