import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FeaturePage } from "@/components/layout/FeaturePage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useEarnTasks, useCompleteTask, getSurveyQuestions } from "@/hooks/useEarnTasks";
import { cn } from "@/lib/utils";

type Answer = string | string[];

export default function SurveyRun() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tasks, done } = useEarnTasks("survey");
  const task = tasks.data?.find((t) => t.id === id);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const complete = useCompleteTask(() => navigate("/earn/surveys"));

  if (tasks.isLoading) return <FeaturePage title="Survey" backTo="/earn/surveys"><Skeleton className="h-64 w-full rounded-2xl" /></FeaturePage>;
  if (!task) return <FeaturePage title="Survey" backTo="/earn/surveys"><p className="py-10 text-center text-sm text-muted-foreground">This survey is not available.</p></FeaturePage>;

  const questions = getSurveyQuestions(task);
  const q = questions[step];
  const a = answers[step];
  const answered = Array.isArray(a) ? a.length > 0 : typeof a === "string" && a.trim().length > 0;
  const last = step === questions.length - 1;
  const set = (v: Answer) => setAnswers((prev) => { const n = [...prev]; n[step] = v; return n; });

  if (done.data?.has(task.id)) {
    return <FeaturePage title={task.title} backTo="/earn/surveys"><p className="py-10 text-center text-sm text-muted-foreground">You already completed this survey today. Come back tomorrow.</p></FeaturePage>;
  }

  return (
    <FeaturePage title={task.title} description={`Earn UGX ${Number(task.reward_amount).toLocaleString()} when you finish`} backTo="/earn/surveys">
      <div className="space-y-5">
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Question {step + 1} of {questions.length}</span><span>{Math.round(((step + (answered ? 1 : 0)) / questions.length) * 100)}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((step + (answered ? 1 : 0)) / questions.length) * 100}%` }} /></div>
        </div>
        <div className="card-neon space-y-4 rounded-2xl p-5">
          <p className="text-lg font-semibold">{q.question}</p>
          {q.type === "text" || !q.options?.length ? (
            <Textarea maxLength={500} placeholder="Type your answer" value={(a as string) || ""} onChange={(e) => set(e.target.value)} />
          ) : (
            <div className="space-y-2">
              {q.options.map((o) => {
                const sel = q.type === "multi" ? ((a as string[]) || []).includes(o) : a === o;
                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => {
                      if (q.type === "multi") {
                        const cur = (a as string[]) || [];
                        set(sel ? cur.filter((x) => x !== o) : [...cur, o]);
                      } else set(o);
                    }}
                    className={cn("w-full rounded-xl border p-3 text-left text-sm transition-colors", sel ? "border-primary bg-primary/15 font-medium" : "border-border hover:border-primary/50")}
                  >
                    {o}
                  </button>
                );
              })}
              {q.type === "multi" && <p className="text-xs text-muted-foreground">Select all that apply</p>}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-full" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
          {last ? (
            <Button className="flex-1 rounded-full gradient-primary border-0 font-bold text-primary-foreground" disabled={!answered || complete.isPending} onClick={() => complete.mutate({ taskId: task.id, answers })}>
              {complete.isPending ? "Submitting…" : "Submit & earn"}
            </Button>
          ) : (
            <Button className="flex-1 rounded-full gradient-primary border-0 font-bold text-primary-foreground" disabled={!answered} onClick={() => setStep(step + 1)}>Next</Button>
          )}
        </div>
      </div>
    </FeaturePage>
  );
}
