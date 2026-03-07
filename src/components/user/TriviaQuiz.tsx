import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Coins, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TriviaQuestion {
  question: string;
  answers: [string, string, string, string];
  correctIndex: number;
}

interface TriviaQuizProps {
  questions: TriviaQuestion[];
  rewardAmount: number;
  isPending: boolean;
  onComplete: (correctCount: number, totalCount: number, answers: number[]) => void;
  onClose: () => void;
}

export function TriviaQuiz({ questions, rewardAmount, isPending, onComplete, onClose }: TriviaQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + (isFinished ? 1 : 0)) / questions.length) * 100;

  const handleSelectAnswer = (answerIndex: number) => {
    if (isRevealed) return;
    setSelectedAnswer(answerIndex);
    setIsRevealed(true);

    const isCorrect = answerIndex === currentQuestion.correctIndex;
    const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;
    const newAnswers = [...userAnswers, answerIndex];

    setCorrectCount(newCorrectCount);
    setUserAnswers(newAnswers);

    // Auto-advance after a short delay
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelectedAnswer(null);
        setIsRevealed(false);
      } else {
        setIsFinished(true);
      }
    }, 1200);
  };

  const handleClaim = () => {
    onComplete(correctCount, questions.length, userAnswers);
  };

  if (isFinished) {
    const allCorrect = correctCount === questions.length;
    
    return (
      <div className="space-y-6 py-4">
        <div className="text-center space-y-2">
          {allCorrect ? (
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          ) : (
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
          )}
          <h3 className="text-xl font-bold">
            {allCorrect ? "Perfect Score!" : "Quiz Complete"}
          </h3>
          <p className="text-muted-foreground">
            You got {correctCount} out of {questions.length} correct
          </p>
        </div>

        {allCorrect ? (
          <div className="text-center space-y-3">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Coins className="mr-2 h-5 w-5" />
              +UGX {rewardAmount.toLocaleString()}
            </Badge>
            <div>
              <Button onClick={handleClaim} disabled={isPending} className="w-full">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  "Claim Reward"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              You need to answer all questions correctly to earn the reward.
            </p>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>{correctCount} correct</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      <div className="py-2">
        <h3 className="text-lg font-semibold">{currentQuestion.question}</h3>
      </div>

      {/* Answers */}
      <div className="grid grid-cols-1 gap-3">
        {currentQuestion.answers.map((answer, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === currentQuestion.correctIndex;

          let variant: "default" | "correct" | "wrong" | "idle" = "idle";
          if (isRevealed) {
            if (isCorrect) variant = "correct";
            else if (isSelected && !isCorrect) variant = "wrong";
          }

          return (
            <Card
              key={index}
              className={cn(
                "cursor-pointer transition-all border-2",
                !isRevealed && "hover:border-primary/50 hover:shadow-sm",
                isRevealed && "cursor-default",
                variant === "correct" && "border-green-500 bg-green-50 dark:bg-green-950/30",
                variant === "wrong" && "border-destructive bg-destructive/10",
                variant === "idle" && isRevealed && "opacity-50"
              )}
              onClick={() => handleSelectAnswer(index)}
            >
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold",
                    variant === "correct" && "border-green-500 bg-green-500 text-white",
                    variant === "wrong" && "border-destructive bg-destructive text-white",
                    variant === "idle" && !isRevealed && "border-muted-foreground/30",
                    variant === "idle" && isRevealed && "border-muted-foreground/20"
                  )}
                >
                  {String.fromCharCode(65 + index)}
                </div>
                <span className="font-medium">{answer}</span>
                {isRevealed && isCorrect && (
                  <CheckCircle2 className="ml-auto h-5 w-5 text-green-500" />
                )}
                {isRevealed && isSelected && !isCorrect && (
                  <XCircle className="ml-auto h-5 w-5 text-destructive" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reward info */}
      <div className="flex items-center justify-center pt-2">
        <Badge variant="secondary">
          <Coins className="mr-1 h-3 w-3" />
          UGX {rewardAmount.toLocaleString()} reward
        </Badge>
      </div>
    </div>
  );
}
