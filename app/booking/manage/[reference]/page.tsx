import { SelfServiceManager } from '@/components/booking/self-service-manager';

export default async function ManageBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ token?: string; action?: 'cancel' | 'reschedule' }>;
}) {
  const { reference } = await params;
  const { token, action } = await searchParams;

  return (
    <SelfServiceManager
      reference={reference}
      token={token ?? ''}
      action={action === 'reschedule' ? 'reschedule' : 'cancel'}
    />
  );
}
