'use client';

import { useState, useEffect } from 'react';

export default function LossCalculator() {
  const [bags, setBags] = useState(50);

  useEffect(() => {
    const input = document.getElementById('bagLoss') as HTMLInputElement;
    if (!input) return;

    const handler = () => setBags(Number(input.value) || 0);
    input.addEventListener('input', handler);
    return () => input.removeEventListener('input', handler);
  }, []);

  const yearlyLoss = bags * 12 * 20000;

  return (
    <span id="lossAmount">{Math.round(yearlyLoss / 1000000)}</span>
  );
}