import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ManageAppointment } from '@/components/manage-appointment';
import { PublicShell } from '@/components/public-shell';
import { getManagedAppointment } from '@/lib/manage-api';

export const metadata: Metadata = {
  title: 'Quản lý lịch hẹn',
  // Link này là "chìa khoá" vào lịch hẹn: không cho công cụ tìm kiếm lập chỉ mục,
  // và không gửi nó đi qua header Referer khi người dùng bấm sang trang khác.
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function ManagePage({ params }: PageProps<'/manage/[token]'>) {
  return (
    <PublicShell>
      {/* params là dữ liệu theo từng request nên phải nằm trong Suspense (Cache Components) */}
      <Suspense fallback={<ManageSkeleton />}>
        <Manage params={params} />
      </Suspense>
    </PublicShell>
  );
}

async function Manage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const appointment = await getManagedAppointment(token);
  if (!appointment) notFound();

  return <ManageAppointment token={token} initial={appointment} />;
}

function ManageSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-5" aria-busy="true">
      <div className="h-12 w-3/4 rounded-xl bg-paper-sunk" />
      <div className="h-56 rounded-3xl bg-paper-sunk" />
    </div>
  );
}
