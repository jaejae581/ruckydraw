"use client";

import { useState, useEffect, FormEvent, useMemo, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, Ticket, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';


// TYPES
type Ball = {
  id: number;
  number: string;
  name: string;
  prize: string;
};

// CONFETTI COMPONENT
const ConfettiPiece = ({ id }: { id: number }) => {
  const style = useMemo(() => {
    const colors = ['#E91E63', '#673AB7', '#FFC107', '#4CAF50', '#2196F3'];
    return {
      '--color': colors[Math.floor(Math.random() * colors.length)],
      left: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 2 + 3}s`,
      animationDelay: `${Math.random() * 0.5}s`,
      transform: `rotate(${Math.random() * 360}deg)`,
      opacity: 0,
    } as React.CSSProperties;
  }, []);

  return <div className="absolute top-[-10px] w-2.5 h-2.5 bg-[var(--color)] animate-confetti-fall" style={style} />;
};

const Confetti = () => {
  const [pieces, setPieces] = useState<number[]>([]);

  useEffect(() => {
    setPieces(Array.from({ length: 150 }, (_, i) => i));
  }, []);

  if (pieces.length === 0) return null;

  return (
    <div className="absolute inset-0 z-50 pointer-events-none">
      {pieces.map((id) => (
        <ConfettiPiece key={id} id={id} />
      ))}
    </div>
  );
};

// BALL VISUAL COMPONENT
const BallVisual = ({ ball, isShaking, style }: { ball: Ball; isShaking: boolean; style: React.CSSProperties }) => (
  <div
    className={cn(
      "relative flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-lg m-1 transition-transform duration-300 animate-ball-in",
      isShaking && "animate-shake"
    )}
    style={style}
  >
    <div className="absolute top-1/3 left-1/3 w-2.5 h-2.5 bg-white/40 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
    <span className="truncate px-1 text-sm">{ball.number}</span>
  </div>
);

// MAIN PAGE COMPONENT
export default function LuckyDrawPage() {
  const [balls, setBalls] = useState<Ball[]>([]);
  const [drawnBall, setDrawnBall] = useState<Ball | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [drawnBallKey, setDrawnBallKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entryNumber, setEntryNumber] = useState('');
  const [entryName, setEntryName] = useState('');
  const [entryPrize, setEntryPrize] = useState('');

  const numberInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const prizeInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const handleAddEntry = (e: FormEvent) => {
    e.preventDefault();
    if (entryNumber.trim() && entryName.trim() && entryPrize.trim()) {
      setBalls(prev => [...prev, { id: Date.now() + Math.random(), number: entryNumber.trim(), name: entryName.trim(), prize: entryPrize.trim() }]);
      setEntryNumber('');
      setEntryName('');
      setEntryPrize('');
      setIsModalOpen(false);
    }
  };

  const handleDraw = () => {
    if (balls.length === 0) return;

    setIsDrawing(true);
    setDrawnBall(null);
    setShowConfetti(false);

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * balls.length);
      const selectedBall = balls[randomIndex];
      
      setDrawnBall(selectedBall);
      setDrawnBallKey(prev => prev + 1);
      setBalls(prev => prev.filter(ball => ball.id !== selectedBall.id));
      setIsDrawing(false);
      setShowConfetti(true);
      
      setTimeout(() => setShowConfetti(false), 6000);
    }, 2500);
  };
  
  const handleReset = () => {
    setBalls([]);
    setDrawnBall(null);
    setIsDrawing(false);
    setShowConfetti(false);
    setEntryNumber('');
    setEntryName('');
    setEntryPrize('');
  };

  return (
    <div className="min-h-screen w-full bg-background font-body text-foreground">
      <main className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-headline">행운의 추첨</h1>
          <p className="text-muted-foreground mt-2 text-lg">인터랙티브 경품 추첨기!</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <Card className="lg:col-span-2 shadow-xl border-2 border-transparent hover:border-primary/20 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Ticket />
                추첨 제어
              </CardTitle>
              <CardDescription>추첨을 구성하고 참가자를 추가하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="w-full" onClick={() => setIsModalOpen(true)} disabled={isDrawing}>
                      <Plus className="mr-2 h-4 w-4" />
                      추첨권 추가하기
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>새 추첨권 추가</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddEntry} className="space-y-4">
                      <div>
                        <Label htmlFor="entry-number">번호</Label>
                        <Input
                          ref={numberInputRef}
                          id="entry-number"
                          value={entryNumber}
                          onChange={(e) => setEntryNumber(e.target.value)}
                          placeholder="추첨 번호"
                          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              nameInputRef.current?.focus();
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="entry-name">이름</Label>
                        <Input
                          ref={nameInputRef}
                          id="entry-name"
                          value={entryName}
                          onChange={(e) => setEntryName(e.target.value)}
                          placeholder="참가자 이름"
                           onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              prizeInputRef.current?.focus();
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="entry-prize">상품명</Label>
                        <Input
                          ref={prizeInputRef}
                          id="entry-prize"
                          value={entryPrize}
                          onChange={(e) => setEntryPrize(e.target.value)}
                          placeholder="상품"
                           onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              submitButtonRef.current?.click();
                            }
                          }}
                        />
                      </div>
                      <Button ref={submitButtonRef} type="submit" className="w-full">추가</Button>
                    </form>
                  </DialogContent>
                </Dialog>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button onClick={handleDraw} size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg transition-shadow" disabled={isDrawing || balls.length === 0}>
                  {isDrawing ? "추첨 중..." : "지금 추첨!"}
                </Button>
                <Button onClick={handleReset} size="lg" variant="destructive" className="w-full" disabled={isDrawing}>
                  <RotateCcw className="mr-2 h-4 w-4" /> 모두 재설정
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-3">
            <Card className="shadow-xl min-h-[500px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                   추첨기
                </CardTitle>
                <CardDescription>남은 참가자: {balls.length}</CardDescription>
              </CardHeader>
              <CardContent className="relative flex-grow bg-secondary/30 rounded-lg border-2 border-dashed border-primary/20 flex items-center justify-center p-4">
                {/* Balls in the machine */}
                {!drawnBall && (
                    <div className="absolute inset-4 flex flex-wrap content-start items-start p-2 overflow-y-auto">
                        {balls.map((ball, i) => (
                            <BallVisual
                                key={ball.id}
                                ball={ball}
                                isShaking={isDrawing}
                                style={{ animationDelay: `${isDrawing ? '0s' : i * 0.02}s` }}
                            />
                        ))}
                    </div>
                )}

                {/* Result Display */}
                {drawnBall && !isDrawing && (
                    <div key={drawnBallKey} className="w-full h-full flex flex-col items-center justify-center text-center">
                        {showConfetti && <Confetti />}
                        <p className="text-muted-foreground mb-4 font-semibold text-lg">그리고 우승자는...</p>
                        <div className="transform-gpu animate-drawn-ball-tumble">
                            <div className="relative flex items-center justify-center w-48 h-48 rounded-full bg-accent text-accent-foreground font-bold text-2xl shadow-2xl p-4 flex-col">
                                <div className="absolute top-1/3 left-1/3 w-6 h-6 bg-white/40 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                                <span className="text-5xl font-extrabold">{drawnBall.number}</span>
                                <span className="mt-2 text-xl font-semibold truncate">{drawnBall.name}</span>
                                <span className="mt-1 text-base text-accent-foreground/80 truncate">{drawnBall.prize}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!isDrawing && !drawnBall && balls.length === 0 && (
                    <div className="text-center text-muted-foreground">
                        <Ticket size={48} className="mx-auto mb-4" />
                        <p className="font-semibold">추첨기가 비어 있습니다!</p>
                        <p>추첨을 시작하려면 참가자를 추가하세요.</p>
                    </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
