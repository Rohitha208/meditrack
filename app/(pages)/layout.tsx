import { ProductLayoutSwitch } from "@/components/shared/product-layout-switch";

export default function Layout({ children }: { children: React.ReactNode }) {
    return <ProductLayoutSwitch>{children}</ProductLayoutSwitch>;
}
