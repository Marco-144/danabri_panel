import DashboardLayout from "@/components/layouts/DashboardLayout";

export default function DashboardLayoutPage({ children }) {
    return (
        <DashboardLayout>
            {children}
        </DashboardLayout>
    )
}