import { UserLayout } from "@/components/layout/UserLayout";
import { NewsSection } from "@/components/user/NewsSection";
import { Newspaper } from "lucide-react";

export default function News() {
  return (
    <UserLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Newspaper className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">News & Highlights</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Platform news, top earners, promotions and the achievements you have unlocked.
        </p>
        <NewsSection />
      </div>
    </UserLayout>
  );
}
