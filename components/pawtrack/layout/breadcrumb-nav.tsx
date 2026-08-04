import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useRootContext } from "@/context/RootContext"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useGetProductById } from "@/queries/products/get-product-by-id"
import { useGetPatientById } from "@/queries/patients/get-patient-by-id"
import { useGetClientById } from "@/queries/clients/get-client"

// Define a map for overriding abstract breadcrumb paths with concrete ones
const breadcrumbLinkOverrides: { [key: string]: string } = {
  "/appointments": "/appointments/confirmed",
  // Add other overrides here, e.g., "/inventory": "/inventory/dashboard",
};

// Define the type for breadcrumb items
type BreadcrumbItem = {
  label: string
  href: string
}

// Define the type for path mapping
type PathMapping = {
  [key: string]: BreadcrumbItem[]
}

// Define the path mappings
const pathMappings: PathMapping = {
  "/": [
    { label: "Home", href: "/dashboard" }
  ],
  "/dashboard": [
    { label: "Home", href: "/dashboard" },
    { label: "Dashboard", href: "/dashboard" }
  ],
  "/dashboard/ports": [
    { label: "Home", href: "/dashboard" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Ports", href: "/dashboard/ports" }
  ],
  // Add more path mappings as needed
}

// Function to format segment names for display
const formatSegmentName = (segment: string, index: number, segments: string[]): string => {
  // Check if this might be a UUID (UUIDs are typically 36 chars)
  if (segment.length > 30 && segment.includes('-')) {
    // If the UUID follows certain path segments, hide it from the breadcrumb
    if (index > 0) {
      const prev = segments[index - 1].toLowerCase();
      // Hide IDs after these segments
      if (["clinic", "rooms", "doctors", "slots"].includes(prev)) {
        return ""; // skip
      }
    }

    // If previous segment is "companies", show the company ID
    if (index > 0 && segments[index-1].toLowerCase() === "companies") {
      return segment;
    }

    // For other cases, show the ID as is
    return segment;
  }
  
  // For tabs within the clinic section
  if (['rooms', 'slots', 'doctors', 'users'].includes(segment)) {
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  }
  // Map doctor self-service page
  if (segment === 'my-slots') {
    return 'Slots';
  }
  
  // Default capitalization for other segments
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function BreadcrumbNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { userType } = useRootContext()
  
  // Get the breadcrumb items for the current path
  const breadcrumbItems = pathMappings[pathname] || []

  // Split the pathname into segments and create the breadcrumb items
  const segments = pathname.split('/').filter(Boolean)

  // Detect product detail route: .../products/{id}
  const productIdIndex = React.useMemo(() => {
    return segments.findIndex((seg, i) => i > 0 && segments[i - 1].toLowerCase() === 'products')
  }, [segments])
  const productId = productIdIndex !== -1 ? segments[productIdIndex] : undefined

  // Detect client detail route: .../clients/{id}
  const clientIdIndex = React.useMemo(() => {
    return segments.findIndex((seg, i) => i > 0 && segments[i - 1].toLowerCase() === 'clients')
  }, [segments])
  const clientId = clientIdIndex !== -1 ? segments[clientIdIndex] : undefined

  // Detect patient detail route: .../patients/{id}
  const patientIdIndex = React.useMemo(() => {
    return segments.findIndex((seg, i) => i > 0 && segments[i - 1].toLowerCase() === 'patients')
  }, [segments])
  const patientId = patientIdIndex !== -1 ? segments[patientIdIndex] : undefined

  // Fetch product name if on a product detail route
  const { data: productData } = useGetProductById(productId as string, Boolean(productId))
  // Fetch client name if on a client detail route
  const { data: clientData } = useGetClientById(clientId as string)
  // Fetch patient name if on a patient detail route
  const { data: patientData } = useGetPatientById(patientId as string)

  let visibleSegments = segments.map((segment, index) => {
    const rawPath = '/' + segments.slice(0, index + 1).join('/')

    // Replace product ID with product name in breadcrumb when available
    let name = formatSegmentName(segment, index, segments)
    if (index === productIdIndex) {
      name = productData?.name || 'Product'
    }
    // Replace client ID with client name in breadcrumb when available
    if (index === clientIdIndex) {
      name = clientData ? `${clientData.firstName} ${clientData.lastName}`.trim() : 'Client'
    }
    // Replace patient ID with patient name in breadcrumb when available
    else if (index === patientIdIndex) {
      name = patientData?.name || 'Patient'
    }

    // Check for an override, otherwise use the raw path
    const path = breadcrumbLinkOverrides[rawPath] || rawPath;

    return {
      name,
      path
    }
  }).filter(segment => segment.name !== "") // Filter out empty segment names

  // Role-aware adjustments for doctor slots route
  const isDoctorSlotsRoute = /^\/clinic\/[^/]+\/doctors\/slots(\/[^/]+)?$/.test(pathname)
  if (isDoctorSlotsRoute) {
    // For Clinic Admins, hide the top-level Clinic segment
    if (userType?.isClinicAdmin) {
      visibleSegments = visibleSegments.filter(seg => seg.name !== 'Clinic')
    }
    // For Administrators keep as-is (Home > Clinic > Doctors > Slots)
  }

  return (
    <Breadcrumb className="text-sm text-muted-foreground">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink onClick={() => router.push("/dashboard")}>Home</BreadcrumbLink>
        </BreadcrumbItem>

        {visibleSegments.map((segment, index) => {
          const isLast = index === visibleSegments.length - 1;
          
          return (
            <React.Fragment key={segment.path + '-' + index}>
              <BreadcrumbSeparator className='text-primary' />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{segment.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink onClick={() => router.push(segment.path)}>
                    {segment.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
} 