'use client';
import { useSearchParams } from 'next/navigation';
import { ImpersonationDrawer } from '@/components/admin/impersonation-drawer';

function ImpersonatingWrapper({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const factoryName = searchParams.get('impersonating');
  const factoryId = searchParams.get('factoryId');
  const hasImpersonating = factoryName && factoryId;

  const handleEndImpersonation = async () => {
    await fetch('/api/admin/impersonate/end', { method: 'POST' });
  };

  return (
    <>
      {hasImpersonating && (
        <ImpersonationDrawer
          factoryId={factoryId!}
          factoryName={factoryName!}
          onClose={handleEndImpersonation}
        />
      )}
      {children}
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ImpersonatingWrapper>{children}</ImpersonatingWrapper>;
}