import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

export interface TriviaQuestion {
  question: string;
  answers: [string, string, string, string];
  correctIndex: number;
}

interface TriviaQuestionEditorProps {
  questions: TriviaQuestion[];
  onChange: (questions: TriviaQuestion[]) => void;
}

export function TriviaQuestionEditor({ questions, onChange }: TriviaQuestionEditorProps) {
  const addQuestion = () => {
    onChange([
      ...questions,
      { question: "", answers: ["", "", "", ""], correctIndex: 0 },
    ]);
  };

  const removeQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: string, value: string | number) => {
    const updated = [...questions];
    if (field === "question") {
      updated[index] = { ...updated[index], question: value as string };
    } else if (field === "correctIndex") {
      updated[index] = { ...updated[index], correctIndex: value as number };
    }
    onChange(updated);
  };

  const updateAnswer = (qIndex: number, aIndex: number, value: string) => {
    const updated = [...questions];
    const answers = [...updated[qIndex].answers] as [string, string, string, string];
    answers[aIndex] = value;
    updated[qIndex] = { ...updated[qIndex], answers };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {questions.map((q, qIndex) => (
        <Card key={qIndex}>
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Question {qIndex + 1}</Label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeQuestion(qIndex)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <Input
              value={q.question}
              onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
              placeholder="Enter question"
            />
            {q.answers.map((answer, aIndex) => (
              <div key={aIndex} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${qIndex}`}
                  checked={q.correctIndex === aIndex}
                  onChange={() => updateQuestion(qIndex, "correctIndex", aIndex)}
                />
                <Input
                  value={answer}
                  onChange={(e) => updateAnswer(qIndex, aIndex, e.target.value)}
                  placeholder={`Answer ${String.fromCharCode(65 + aIndex)}`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" onClick={addQuestion} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Question
      </Button>
    </div>
  );
}
