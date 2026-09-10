import { requireRole } from "@/lib/auth/guards";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["admin"], "/admin/login");
  return <AdminShell user={{ name: profile.name, image: profile.profile_image, roleLabel: "Administrator" }}>{children}</AdminShell>;
}
