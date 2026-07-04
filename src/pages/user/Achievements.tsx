import { UserLayout } from "@/components/layout/UserLayout";
import { AchievementsSection } from "@/components/user/AchievementsSection";
import { Trophy } from "lucide-react";

export default function Achievements() {
  return (
    <UserLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-secondary" />
          <h1 className="text-xl font-bold">Achievement Tasks</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Complete milestones to unlock bonus rewards.
        </p>
        <AchievementsSection />
      </div>
    </UserLayout>
  );
}
