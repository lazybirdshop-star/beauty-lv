'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createBooking } from '@/features/bookings/api';
import { NewBookingSheet } from '@/features/bookings/components/new-booking-sheet';
import { createClient, listClients } from '@/features/clients/api';
import { ClientFormSheet } from '@/features/clients/components/client-form-sheet';
import { listServices } from '@/features/services/api';
import { listSlots } from '@/features/scheduling/api';
import { bookableSlots } from '@/features/scheduling/bookable';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useT } from '@/lib/i18n';
import { SideSheet } from './side-sheet';
import type { WorkspaceAction } from '../workspace-actions';

type CreateAction = Exclude<WorkspaceAction, { kind: 'search' }>;

/** Mounted for one action only: form state cannot leak into the next creation. */
export function WorkspaceCreateSheet({
  slug,
  action,
  onClose,
}: {
  slug: string;
  action: CreateAction;
  onClose: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const cache = useQueryClient();
  const booking = action.kind === 'booking';
  const clients = useQuery({
    queryKey: ['clients', slug],
    queryFn: () => listClients(slug),
    enabled: booking,
  });
  const services = useQuery({
    queryKey: ['services', slug],
    queryFn: () => listServices(slug),
    enabled: booking,
  });
  const slots = useQuery({
    queryKey: ['slots', slug, 'create'],
    queryFn: () => listSlots(slug, { from: new Date() }),
    enabled: booking,
  });
  const saved = async () => {
    await Promise.all(
      ['bookings', 'slots', 'clients', 'quick-search'].map((key) =>
        cache.invalidateQueries({ queryKey: [key] }),
      ),
    );
    onClose();
    router.refresh();
  };
  const createVisit = useMutation({
    mutationFn: (input: Parameters<typeof createBooking>[1]) => createBooking(slug, input),
    onSuccess: saved,
  });
  const createPerson = useMutation({
    mutationFn: (input: Parameters<typeof createClient>[1]) => createClient(slug, input),
    onSuccess: saved,
  });

  if (!booking)
    return (
      <ClientFormSheet
        open
        client={null}
        onOpenChange={(open) => !open && onClose()}
        onSubmit={async (input) => {
          await createPerson.mutateAsync(input);
        }}
        submitting={createPerson.isPending}
      />
    );
  const failed = clients.isError || services.isError || slots.isError;
  if (failed || clients.isPending || services.isPending || slots.isPending)
    return (
      <SideSheet
        open
        onOpenChange={(open) => !open && onClose()}
        title={t.home.newBooking}
        closeLabel={t.common.close}
      >
        {failed ? (
          <LoadError
            onRetry={() => {
              void clients.refetch();
              void services.refetch();
              void slots.refetch();
            }}
          />
        ) : (
          <Skeleton className="h-64 w-full" />
        )}
      </SideSheet>
    );
  const client = clients.data.find((item) => item.id === action.clientId);
  return (
    <NewBookingSheet
      open
      onOpenChange={(open) => !open && onClose()}
      availableSlots={bookableSlots(slots.data)}
      services={services.data}
      clients={clients.data}
      guest={client ? { name: client.fullName, phone: client.phone } : undefined}
      initialDateTime={action.date && action.time ? `${action.date}T${action.time}` : undefined}
      onSubmit={async (input) => {
        await createVisit.mutateAsync(input);
      }}
      submitting={createVisit.isPending}
    />
  );
}
