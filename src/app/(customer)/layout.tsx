import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <div className="hidden md:block">
        <SiteFooter />
      </div>
      <BottomNav />
    </>
  );
}
