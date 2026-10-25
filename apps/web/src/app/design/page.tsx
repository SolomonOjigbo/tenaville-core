import { notFound } from 'next/navigation';

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Money,
  MoneyInput,
  PageHeader,
  Select,
  Stat,
  Table,
  Td,
  TextInput,
  Th,
  leaseStatusTone,
  statusLabel,
  unitStatusTone,
} from '../../components/ui';
import { ThemeToggle } from '../../components/shell/theme-toggle';
import { Sidebar } from '../../components/shell/sidebar';
import { groupedNavigationFor } from '../../lib/nav';

/**
 * The design system, rendered.
 *
 * A gallery rather than a written specification: the point of a design system
 * is that someone can see whether a status badge reads correctly in both
 * themes, and no amount of prose settles that. It also exercises the real
 * components against the real tokens, so a palette change that breaks contrast
 * shows up here before it reaches a screen.
 *
 * Development only. There is no public surface (PROP-9), and a component
 * gallery on a production deployment is an invitation to probe it.
 */
export default function DesignPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const navGroups = groupedNavigationFor('property_manager', { crm: false, screening: false });

  return (
    <div className="min-h-screen bg-bg px-8 py-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <PageHeader
          title="Design system"
          description="Tenaville UI kit, rendered against the real tokens. Development only."
          action={<ThemeToggle />}
        />

        <Card>
          <CardHeader title="Money" description="Integer kobo, formatted once, tabular figures." />
          <CardBody className="flex flex-wrap items-baseline gap-6">
            <Money kobo="125000000" className="text-2xl" />
            <Money kobo="4500000" tone="owed" />
            <Money kobo="0" tone="owed" />
            <Money kobo="98765432109" />
            <Money kobo="1" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Status"
            description="Vacant is a warning, not an error: an empty unit is lost rent, not a fault."
          />
          <CardBody className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {['occupied', 'vacant', 'reserved', 'under_maintenance', 'inactive'].map((s) => (
                <Badge key={s} tone={unitStatusTone(s)}>
                  {statusLabel(s)}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {['draft', 'active', 'expiring_soon', 'expired', 'renewed', 'terminated'].map((s) => (
                <Badge key={s} tone={leaseStatusTone(s)}>
                  {statusLabel(s)}
                </Badge>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Buttons" description="44px minimum height for field use." />
          <CardBody className="flex flex-wrap items-center gap-3">
            <Button>Record payment</Button>
            <Button variant="secondary">Export</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger">Reverse payment</Button>
            <Button size="sm" variant="secondary">
              Small
            </Button>
            <Button disabled>Disabled</Button>
          </CardBody>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Units under management" value={128} />
          <Stat label="Occupancy" value="94%" hint="Excludes units marked inactive" />
          <Stat label="Arrears" value={<Money kobo="23450000" tone="owed" />} />
          <Stat label="Collected this month" value={<Money kobo="412000000" tone="paid" />} />
        </div>

        <Card>
          <CardHeader title="Empty state" description="An agency's first week is spent here." />
          <EmptyState
            title="No properties yet"
            description="Import your portfolio from a spreadsheet, or add a property and its units. Every import is a dry run first, so you see exactly what will be created."
            action={<Button>Import a spreadsheet</Button>}
          />
        </Card>

        <Card>
          <CardHeader
            title="Form controls"
            description="Labels are always rendered and always tied to the control: a placeholder is not a label."
          />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field id="demo-name" label="Tenant name" required>
              <TextInput id="demo-name" placeholder="Emeka Nwosu" />
            </Field>
            <Field id="demo-phone" label="Phone" hint="Nigerian number, 0803… or +234…">
              <TextInput id="demo-phone" placeholder="08030000001" describedBy="demo-phone-hint" />
            </Field>
            <Field id="demo-rent" label="Annual rent">
              <MoneyInput id="demo-rent" placeholder="1,200,000.00" />
            </Field>
            <Field id="demo-type" label="Unit type">
              <Select id="demo-type" defaultValue="flat">
                <option value="flat">Flat</option>
                <option value="self_contained">Self contained</option>
                <option value="shop">Shop</option>
              </Select>
            </Field>
            <Field id="demo-bad" label="State" error="Nairobi is not a Nigerian state">
              <TextInput
                id="demo-bad"
                defaultValue="Nairobi"
                invalid
                describedBy="demo-bad-error"
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Table"
            description="Scrolls inside itself, so a wide rent roll never makes the page scroll sideways."
          />
          <CardBody>
            <Table caption="Example rent roll">
              <thead>
                <tr>
                  <Th>Unit</Th>
                  <Th>Tenant</Th>
                  <Th>Status</Th>
                  <Th numeric>Rent</Th>
                  <Th numeric>Arrears</Th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td>Flat 1</Td>
                  <Td>Emeka Nwosu</Td>
                  <Td>
                    <Badge tone={unitStatusTone('occupied')}>Occupied</Badge>
                  </Td>
                  <Td numeric>
                    <Money kobo="120000000" symbol={false} />
                  </Td>
                  <Td numeric>
                    <Money kobo="0" symbol={false} tone="owed" />
                  </Td>
                </tr>
                <tr>
                  <Td>Flat 2</Td>
                  <Td>Fatima Aliyu</Td>
                  <Td>
                    <Badge tone={unitStatusTone('occupied')}>Occupied</Badge>
                  </Td>
                  <Td numeric>
                    <Money kobo="95000000" symbol={false} />
                  </Td>
                  <Td numeric>
                    <Money kobo="4750000" symbol={false} tone="owed" />
                  </Td>
                </tr>
                <tr>
                  <Td>Shop A</Td>
                  <Td>—</Td>
                  <Td>
                    <Badge tone={unitStatusTone('vacant')}>Vacant</Badge>
                  </Td>
                  <Td numeric>
                    <Money kobo="45000000" symbol={false} />
                  </Td>
                  <Td numeric>—</Td>
                </tr>
              </tbody>
            </Table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Navigation"
            description="Filtered by role. This is a property manager's sidebar: no ledger settings, no administration."
          />
          <CardBody>
            <div className="h-[420px] overflow-hidden rounded-md border border-border">
              <Sidebar groups={navGroups} organisationName="Ikoyi Realty" />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
