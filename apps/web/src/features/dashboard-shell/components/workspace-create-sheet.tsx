'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createBooking } from '@/features/bookings/api';
import { NewBookingSheet } from '@/features/bookings/components/new-booking-sheet';
import { createClient, listClients } from '@/features/clients/api';
import { ClientFormSheet } from '@/features/clients/components/client-form-sheet';
import { listServices } from '@/features/services/api';
import { listSlots } from '@/features/scheduling/api';
import { bookableSlots } from '@/features/scheduling/bookable';
import { BlockTimeSheet } from '@/features/scheduling/components/block-time-sheet';
import { useTimeBlockMutations } from '@/features/scheduling/use-time-blocks';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { selectableMembers, useTeamRoster } from '@/features/team/use-team-roster';
import { useT } from '@/lib/i18n';
import { SideSheet } from './side-sheet';
import type { WorkspaceAction } from '../workspace-actions';
import { useWorkspace } from '../workspace-context';

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
  const block = action.kind === 'block';
  const workspace = useWorkspace();
  const selfId = workspace?.memberId ?? undefined;
  /* Состав — только там, где есть кого выбирать: у соло-мастера форма не
     спрашивает «к кому», и лишний запрос ей не нужен. */
  const roster = useTeamRoster(
    slug,
    (booking || block) && Boolean(workspace?.capabilities.canViewTeamCalendar),
  );
  /* За кого блок: колонка, по которой нажали, — или сам человек. */
  const [blockOwner, setBlockOwner] = useState(() =>
    action.kind === 'block' ? action.memberId : undefined,
  );
  const blockMutations = useTimeBlockMutations(slug);
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

  if (action.kind === 'block') {
    const members = selectableMembers(roster.data);
    const owner = blockOwner ?? selfId;
    return (
      <BlockTimeSheet
        open
        onOpenChange={(open) => !open && onClose()}
        initial={{ date: action.date, from: action.from, to: action.to }}
        owner={
          workspace?.capabilities.canManageOthersSchedule && members.length > 1
            ? { members, memberId: owner ?? '', onChange: setBlockOwner }
            : undefined
        }
        submitting={blockMutations.create.isPending}
        onSubmit={async (input) => {
          /* За себя поле не отправляется — лишний идентификатор в запросе
             лишний повод для отказа. */
          await blockMutations.create.mutateAsync({
            ...input,
            organizationMemberId: owner && owner !== selfId ? owner : undefined,
          });
          router.refresh();
        }}
      />
    );
  }
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
      members={selectableMembers(roster.data)}
      memberId={action.memberId ?? workspace?.memberId}
      onSubmit={async (input) => {
        await createVisit.mutateAsync(input);
      }}
      submitting={createVisit.isPending}
    />
  );
}
