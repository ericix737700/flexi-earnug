import { Link } from "react-router-dom";
import { FeaturePage } from "@/components/layout/FeaturePage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEarnTasks, getSurveyQuestions } from "@/hooks/useEarnTasks";
import { CheckCircle2, ClipboardList } from "lucide-react";

export default function EarnSurveys() {
  const { tasks, done } = useEarnTasks("survey");
  const list = tasks.data || [];
  return (
    <FeaturePage title="Surveys" description="Share your opinion and earn. Each survey pays once a day." backTo="/dashboard">
      <div className="space-y-3">
        {tasks.isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        {!tasks.isLoading && list.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No surveys available right now. Check back soon.</p>}
        {list.map((t) => {
          const isDone = done.data?.has(t.id);
          const n = getSurveyQuestions(t).length;
          return (
            <div key={t.id} className="card-neon flex items-center gap-3 rounded-2xl p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary"><ClipboardList className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{t.title}</p>
                <p className="text-xs text-muted-foreground"><span className="font-bold text-primary">+UGX {Number(t.reward_amount).toLocaleString()}</span> · {n} question{n > 1 ? "s" : ""}</p>
              </div>
              {isDone ? (
                <span className="flex items-center gap-1 text-xs font-medium text-primary"><CheckCircle2 className="h-4 w-4" />Done</span>
              ) : (
                <Button asChild size="sm" className="rounded-full gradient-primary border-0 px-5 font-bold text-primary-foreground">
                  <Link to={`/earn/surveys/${t.id}`}>Start</Link>
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </FeaturePage>
  );
}
