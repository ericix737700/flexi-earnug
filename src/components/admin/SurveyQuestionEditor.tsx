import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { SurveyQuestion } from "@/hooks/useEarnTasks";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

interface Props {
  questions: SurveyQuestion[];
  onChange: (q: SurveyQuestion[]) => void;
  taskId?: string;
}

export function SurveyQuestionEditor({ questions, onChange, taskId }: Props) {
  const update = (i: number, patch: Partial<SurveyQuestion>) => onChange(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, d: number) => {
    const n = [...questions];
    const j = i + d;
    if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };

  const responses = useQuery({
    queryKey: ["survey-responses", taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const { data } = await supabase.from("survey_responses").select("id, answers, created_at").eq("task_id", taskId!).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Survey questions</Label>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...questions, { question: "", type: "single", options: ["", ""] }])}>
          <Plus className="mr-1 h-3 w-3" />Add
        </Button>
      </div>
      {questions.length === 0 && <p className="text-xs text-muted-foreground">No questions yet — users will see a default "How did you hear about FlexiEarn?" question.</p>}
      {questions.map((q, i) => (
        <div key={i} className="space-y-2 rounded-md border bg-background p-2">
          <div className="flex gap-1">
            <Input placeholder={`Question ${i + 1}`} value={q.question} maxLength={200} onChange={(e) => update(i, { question: e.target.value })} />
            <Button type="button" size="icon" variant="ghost" onClick={() => move(i, -1)}><ArrowUp className="h-3 w-3" /></Button>
            <Button type="button" size="icon" variant="ghost" onClick={() => move(i, 1)}><ArrowDown className="h-3 w-3" /></Button>
            <Button type="button" size="icon" variant="ghost" onClick={() => onChange(questions.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </div>
          <Select value={q.type} onValueChange={(v) => update(i, { type: v as SurveyQuestion["type"] })}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single choice</SelectItem>
              <SelectItem value="multi">Multiple choice</SelectItem>
              <SelectItem value="text">Short text</SelectItem>
            </SelectContent>
          </Select>
          {q.type !== "text" && (
            <div className="space-y-1">
              {(q.options || []).map((o, k) => (
                <div key={k} className="flex gap-1">
                  <Input className="h-8" placeholder={`Option ${k + 1}`} value={o} maxLength={100} onChange={(e) => update(i, { options: (q.options || []).map((x, m) => (m === k ? e.target.value : x)) })} />
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => update(i, { options: (q.options || []).filter((_, m) => m !== k) })}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
              <Button type="button" size="sm" variant="ghost" onClick={() => update(i, { options: [...(q.options || []), ""] })}><Plus className="mr-1 h-3 w-3" />Option</Button>
            </div>
          )}
        </div>
      ))}
      {taskId && (
        <details className="rounded-md border bg-background p-2 text-xs">
          <summary className="cursor-pointer font-medium">Responses ({responses.data?.length ?? 0}{responses.data?.length === 50 ? "+" : ""})</summary>
          <div className="mt-2 max-h-48 space-y-2 overflow-auto">
            {responses.data?.map((r: any) => (
              <div key={r.id} className="rounded border p-2">
                <p className="text-muted-foreground">{new Date(r.created_at).toLocaleString("en-UG")}</p>
                {(Array.isArray(r.answers) ? r.answers : []).map((a: any, k: number) => (
                  <p key={k}><span className="font-medium">Q{k + 1}:</span> {Array.isArray(a) ? a.join(", ") : String(a)}</p>
                ))}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
