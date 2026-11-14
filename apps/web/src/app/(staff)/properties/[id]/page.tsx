import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';

import { createAdminClient } from '@tenaville/db';

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LinkButton,
  Money,
  PageHeader,
  Table,
  TableEmpty,
  Td,
  Th,
  statusLabel,
  unitStatusTone,
} from '../../../../components/ui';
import { PropertyPhotoForm } from '../../../../components/forms/property-photo-form';
import { UnitForm } from '../../../../components/forms/unit-form';
import { formatDate } from '../../../../lib/format';
import { archivePropertyAction, archiveUnitAction } from '../../../../server/portfolio-actions';
import { currentViewer, supabaseForRequest } from '../../../../server/session';

/** One property, its landlord and its units (PROP-1, PROP-2). */
export default async function PropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: pageError } = await searchParams;
  const { id } = await params;

  const viewer = await currentViewer();
  if (viewer === null) redirect('/sign-in');

  if (!viewer.access.can('property.read')) {
    return (
      <Card>
        <EmptyState
          title="You cannot see this property"
          description="Property records follow the portfolio permission."
          action={
            <LinkButton href="/dashboard" variant="secondary">
              Back to dashboard
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const supabase = await supabaseForRequest();
  const [{ data: property, error }, { data: photoRows }] = await Promise.all([
    supabase
      .from('properties')
      .select(
        'id, name, reference, property_type, address_line, lga, area, state_code, notes, created_at, archived_at, landlords(display_name, phone, email), units(id, label, reference, unit_type, status, asking_rent_kobo, facilities, archived_at)',
      )
      .eq('id', id)
      .order('label', { referencedTable: 'units' })
      .maybeSingle(),
    supabase
      .from('property_photos')
      .select('id, storage_path, caption, created_at')
      .eq('property_id', id)
      .order('sort_order')
      .order('created_at'),
  ]);

  if (error !== null || property === null) notFound();

  const units = property.units;
  const landlord = property.landlords;
  const uploadedPhotos = photoRows ?? [];
  const admin = uploadedPhotos.length === 0 ? null : createAdminClient('sign property photos');
  const photos =
    admin === null
      ? []
      : await Promise.all(
          uploadedPhotos.map(async (photo) => {
            const { data: signed } = await admin.storage
              .from('documents')
              .createSignedUrl(photo.storage_path, 60 * 60);
            return { ...photo, url: signed?.signedUrl ?? null };
          }),
        );

  return (
    <>
      <PageHeader
        title={property.name}
        description={`${property.address_line}${property.lga === null ? '' : `, ${property.lga}`} · ${property.state_code}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href="/properties" variant="secondary">
              Back to properties
            </LinkButton>
            {viewer.access.can('property.write') && property.archived_at === null && (
              <>
                <LinkButton href={`/properties/${property.id}/edit`} variant="secondary">
                  Edit property
                </LinkButton>
                <form action={archivePropertyAction}>
                  <input type="hidden" name="propertyId" value={property.id} />
                  <button
                    type="submit"
                    className="inline-flex min-h-[44px] items-center rounded-md border border-danger bg-surface px-4 text-sm font-medium text-danger-text hover:bg-danger-soft"
                  >
                    Archive
                  </button>
                </form>
              </>
            )}
          </div>
        }
      />

      {property.archived_at !== null && (
        <div className="mb-4 rounded-md bg-surface2 px-4 py-3 text-sm text-muted">
          This property is archived. Its records remain visible for history.
        </div>
      )}

      {pageError === 'archive' && (
        <div
          role="alert"
          className="mb-4 rounded-md bg-warning-soft px-4 py-3 text-sm text-warning-text"
        >
          That property or unit could not be archived. An active lease must be ended first.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Photos"
              description="Private to this organisation. Images are served through short-lived links."
            />
            <CardBody className="space-y-4">
              {photos.length === 0 ? (
                <p className="text-sm text-muted">No photos yet.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {photos.map((photo) => (
                    <figure
                      key={photo.id}
                      className="overflow-hidden rounded-md border border-border"
                    >
                      {photo.url === null ? (
                        <div className="flex h-40 items-center justify-center bg-surface2 text-xs text-subtle">
                          Image unavailable
                        </div>
                      ) : (
                        <Image
                          src={photo.url}
                          alt={photo.caption ?? 'Property photo'}
                          width={640}
                          height={420}
                          unoptimized
                          className="h-40 w-full object-cover"
                        />
                      )}
                      {photo.caption !== null && (
                        <figcaption className="px-3 py-2 text-xs text-muted">
                          {photo.caption}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              )}
              {property.archived_at === null &&
                (viewer.access.can('property.write') || viewer.access.can('maintenance.write')) && (
                  <PropertyPhotoForm propertyId={property.id} />
                )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Units"
              description="What can be let. A unit's occupancy follows its lease, not this screen."
            />
            <CardBody className="p-0">
              <Table caption="Units">
                <thead>
                  <tr>
                    <Th>Unit</Th>
                    <Th>Type</Th>
                    <Th>Status</Th>
                    <Th numeric>Asking rent</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {units.length === 0 ? (
                    <TableEmpty colSpan={5} message="No units yet." />
                  ) : (
                    units.map((unit) => (
                      <tr key={unit.id}>
                        <Td>
                          {unit.label}
                          {unit.reference !== null && (
                            <span className="block text-xs text-subtle">{unit.reference}</span>
                          )}
                          {unit.facilities.length > 0 && (
                            <span className="block text-xs text-subtle">
                              {unit.facilities.join(' · ')}
                            </span>
                          )}
                        </Td>
                        <Td>{statusLabel(unit.unit_type)}</Td>
                        <Td>
                          {unit.archived_at !== null ? (
                            <Badge tone="neutral">Archived</Badge>
                          ) : (
                            <Badge tone={unitStatusTone(unit.status)}>
                              {statusLabel(unit.status)}
                            </Badge>
                          )}
                        </Td>
                        <Td numeric>
                          {unit.asking_rent_kobo === null ? (
                            '—'
                          ) : (
                            <Money kobo={String(unit.asking_rent_kobo)} />
                          )}
                        </Td>
                        <Td>
                          {viewer.access.can('property.write') && unit.archived_at === null ? (
                            <div className="flex flex-wrap items-center gap-3">
                              <a
                                href={`/properties/${property.id}/units/${unit.id}/edit`}
                                className="text-info-text underline-offset-2 hover:underline"
                              >
                                Edit
                              </a>
                              <form action={archiveUnitAction}>
                                <input type="hidden" name="propertyId" value={property.id} />
                                <input type="hidden" name="unitId" value={unit.id} />
                                <button
                                  type="submit"
                                  className="text-danger-text underline-offset-2 hover:underline"
                                >
                                  Archive
                                </button>
                              </form>
                            </div>
                          ) : (
                            '—'
                          )}
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </CardBody>
          </Card>

          {viewer.access.can('property.write') && property.archived_at === null && (
            <Card>
              <CardHeader title="Add a unit" description="You can add another at any time." />
              <CardBody>
                <UnitForm propertyId={property.id} />
              </CardBody>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader title="Property" description="Ownership and reference." />
          <CardBody>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-subtle">Landlord</dt>
                <dd className="mt-0.5 text-text">{landlord?.display_name ?? 'Not recorded'}</dd>
                {landlord?.phone !== null && landlord?.phone !== undefined && (
                  <dd className="text-xs text-muted">{landlord.phone}</dd>
                )}
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-subtle">Type</dt>
                <dd className="mt-0.5 text-text">{statusLabel(property.property_type)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-subtle">Reference</dt>
                <dd className="mt-0.5 text-text">{property.reference ?? '—'}</dd>
              </div>
              {property.area !== null && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-subtle">Area</dt>
                  <dd className="mt-0.5 text-text">{property.area}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs uppercase tracking-wide text-subtle">Added</dt>
                <dd className="mt-0.5 text-text">{formatDate(property.created_at.slice(0, 10))}</dd>
              </div>
              {property.notes !== null && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-subtle">Notes</dt>
                  <dd className="mt-0.5 text-text">{property.notes}</dd>
                </div>
              )}
            </dl>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
