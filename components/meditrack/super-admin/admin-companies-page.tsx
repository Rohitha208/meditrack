"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Eye, Loader2, Plus } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { useCreateCompany } from "@/queries/companies/create-company"
import { useGetCompanies, type Company } from "@/queries/companies/get-company"
import {
  DetailDrawer,
  FormDialog,
  InfoRow,
  MtButton,
  MtDataTable,
  RowActions,
  StatusBadge,
  TableSkeleton,
  type MtColumn,
} from "@/components/meditrack/shared"
import { AdminPageHeader } from "@/components/meditrack/admin/register/AdminPageHeader"
import { AdminCard } from "@/components/meditrack/admin/register/AdminCard"

const EMPTY_FORM = {
  name: "",
  description: "",
  registrationNumber: "",
  email: "",
  phone: "",
  domainName: "",
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
}

function formatStatus(status?: string) {
  if (!status) return "—"
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function AdminCompaniesPage() {
  const { toast } = useToast()
  const createCompany = useCreateCompany()
  const { data, isLoading, isError, error } = useGetCompanies(true, 1, 100)

  const [addOpen, setAddOpen] = useState(false)
  const [viewCompany, setViewCompany] = useState<Company | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const companies = data?.items ?? []
  const isSaving = createCompany.isPending

  function openAdd() {
    setForm(EMPTY_FORM)
    setAddOpen(true)
  }

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    try {
      await createCompany.mutateAsync({
        name: form.name.trim(),
        description: form.description.trim(),
        registrationNumber: form.registrationNumber.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        domainName: form.domainName.trim(),
        address: {
          street: form.street.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          postalCode: form.postalCode.trim(),
          country: form.country.trim(),
        },
        status: "active",
        productType: "human",
      })
      setAddOpen(false)
      setForm(EMPTY_FORM)
      toast({ title: "Company created", description: `${form.name.trim()} was added.` })
    } catch (err) {
      toast({
        title: "Could not create company",
        description: getToastErrorMessage(err, "Failed to create company"),
        variant: "destructive",
      })
    }
  }

  const columns: MtColumn<Company>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Company",
        alwaysVisible: true,
        render: (r) => <span className="font-semibold text-adminreg-text">{r.name}</span>,
        sortValue: (r) => r.name,
      },
      {
        key: "domain",
        header: "Domain",
        render: (r) => r.domainName || "—",
        sortValue: (r) => r.domainName || "",
      },
      {
        key: "email",
        header: "Email",
        render: (r) => r.email || "—",
        sortValue: (r) => r.email || "",
      },
      {
        key: "phone",
        header: "Phone",
        render: (r) => r.phone || "—",
        sortValue: (r) => r.phone || "",
      },
      {
        key: "status",
        header: "Status",
        render: (r) => <StatusBadge status={formatStatus(r.status)} />,
        sortValue: (r) => r.status || "",
      },
      {
        key: "action",
        header: "Action",
        alwaysVisible: true,
        className: "text-right",
        headerClassName: "text-right",
        render: (r) => (
          <RowActions actions={[{ icon: Eye, label: "View", onClick: () => setViewCompany(r) }]} />
        ),
      },
    ],
    []
  )

  const companyFormFields = (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Company Name</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Sri Rama Chandra Hospital"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Domain</Label>
        <Input
          value={form.domainName}
          onChange={(e) => setForm((f) => ({ ...f, domainName: e.target.value }))}
          placeholder="e.g. srirama"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Registration Number</Label>
        <Input
          value={form.registrationNumber}
          onChange={(e) => setForm((f) => ({ ...f, registrationNumber: e.target.value }))}
          placeholder="Hospital registration ID"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="admin@hospital.com"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Phone</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+91 …"
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Street</Label>
        <Input
          value={form.street}
          onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
          placeholder="Street address"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">City</Label>
          <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">State</Label>
          <Input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Postal Code</Label>
          <Input
            value={form.postalCode}
            onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Country</Label>
          <Input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} required />
        </div>
      </div>
    </>
  )

  return (
    <div>
      <AdminPageHeader
        title="Companies"
        subtitle="Hospital tenants — create and manage MediTrack companies."
        actions={
          <MtButton className="gap-2" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add company
          </MtButton>
        }
      />

      <AdminCard title="Company Master" noPadding>
        {isLoading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : isError ? (
          <p className="px-5 py-8 text-sm text-adminreg-red">{getToastErrorMessage(error, "Failed to load companies")}</p>
        ) : (
          <MtDataTable
            columns={columns}
            rows={companies}
            keyExtractor={(r) => r.id}
            emptyTitle="No companies yet"
            emptyDescription="Add a hospital company to onboard a new MediTrack tenant."
          />
        )}
      </AdminCard>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add company"
        onSubmit={handleAdd}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </MtButton>
            <MtButton type="submit" disabled={isSaving}>
              {createCompany.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add company
            </MtButton>
          </>
        }
      >
        {companyFormFields}
      </FormDialog>

      <DetailDrawer
        open={!!viewCompany}
        onOpenChange={(open) => {
          if (!open) setViewCompany(null)
        }}
        title={viewCompany?.name || "Company details"}
        subtitle="Hospital tenant profile"
      >
        {viewCompany ? (
          <div className="space-y-4">
            <InfoRow label="Domain" value={viewCompany.domainName || "—"} />
            <InfoRow label="Email" value={viewCompany.email || "—"} />
            <InfoRow label="Phone" value={viewCompany.phone || "—"} />
            <InfoRow label="Registration" value={viewCompany.registrationNumber || "—"} />
            <InfoRow label="Status" value={formatStatus(viewCompany.status)} />
            <InfoRow
              label="Address"
              value={
                [
                  viewCompany.address?.street,
                  viewCompany.address?.city,
                  viewCompany.address?.state,
                  viewCompany.address?.postalCode,
                  viewCompany.address?.country,
                ]
                  .filter(Boolean)
                  .join(", ") || "—"
              }
            />
          </div>
        ) : null}
      </DetailDrawer>
    </div>
  )
}
