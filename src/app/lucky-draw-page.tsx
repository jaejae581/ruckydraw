"use client";

import { useState, useEffect, FormEvent, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, Ticket, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

// TYPES
type Ball = {
  id: number;
  label: string;
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
    <span className="truncate px-1 text-sm">{ball.label}</span>
  </div>
);

// MAIN PAGE COMPONENT
export default function LuckyDrawPage() {
  const [balls, setBalls] = useState<Ball[]>([]);
  const [drawnBall, setDrawnBall] = useState<Ball | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [ballLabel, setBallLabel] = useState('');
  const [ballCount, setBallCount] = useState<number | ''>('');
  const [drawnBallKey, setDrawnBallKey] = useState(0);

  const handleAddBall = (e: FormEvent) => {
    e.preventDefault();
    if (ballLabel.trim()) {
      setBalls(prev => [...prev, { id: Date.now() + Math.random(), label: ballLabel.trim() }]);
      setBallLabel('');
    }
  };

  const handleAddMultipleBalls = (e: FormEvent) => {
    e.preventDefault();
    if (typeof ballCount === 'number' && ballCount > 0 && ballCount <= 500) {
      const newBalls = Array.from({ length: ballCount }, (_, i) => ({
        id: Date.now() + i + Math.random(),
        label: (balls.length + i + 1).toString(),
      }));
      setBalls(prev => [...prev, ...newBalls]);
      setBallCount('');
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
    setBallLabel('');
    setBallCount('');
  };

  return (
    <div className="min-h-screen w-full bg-background font-body text-foreground">
      <main className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-headline">Lucky Draw</h1>
          <p className="text-muted-foreground mt-2 text-lg">Your interactive prize-drawing machine!</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <Card className="lg:col-span-2 shadow-xl border-2 border-transparent hover:border-primary/20 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Ticket />
                Draw Controls
              </CardTitle>
              <CardDescription>Configure your draw and add entries.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleAddBall} className="space-y-2">
                <Label htmlFor="ball-label" className="font-semibold">Add a Single Entry</Label>
                <div className="flex gap-2">
                  <Input 
                    id="ball-label"
                    placeholder="e.g., John Doe"
                    value={ballLabel}
                    onChange={(e) => setBallLabel(e.target.value)}
                    disabled={isDrawing}
                  />
                  <Button type="submit" variant="secondary" size="icon" disabled={isDrawing || !ballLabel.trim()}><Plus className="h-4 w-4" /></Button>
                </div>
              </form>
              
              <form onSubmit={handleAddMultipleBalls} className="space-y-2">
                <Label htmlFor="ball-count" className="font-semibold">Add Numbered Entries</Label>
                <div className="flex gap-2">
                  <Input
                    id="ball-count"
                    type="number"
                    placeholder="e.g., 50"
                    min="1"
                    max="500"
                    value={ballCount}
                    onChange={(e) => setBallCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                    disabled={isDrawing}
                  />
                  <Button type="submit" variant="secondary" size="icon" disabled={isDrawing || !ballCount || Number(ballCount) <= 0}><Plus className="h-4 w-4" /></Button>
                </div>
              </form>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button onClick={handleDraw} size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg transition-shadow" disabled={isDrawing || balls.length === 0}>
                  {isDrawing ? "Drawing..." : "Draw Now!"}
                </Button>
                <Button onClick={handleReset} size="lg" variant="destructive" className="w-full" disabled={isDrawing}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset All
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-3">
            <Card className="shadow-xl min-h-[500px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                   The Draw Machine
                </CardTitle>
                <CardDescription>Remaining entries: {balls.length}</CardDescription>
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
                        <p className="text-muted-foreground mb-4 font-semibold text-lg">And the winner is...</p>
                        <div className="transform-gpu animate-drawn-ball-tumble">
                            <div className="relative flex items-center justify-center w-40 h-40 rounded-full bg-accent text-accent-foreground font-bold text-4xl shadow-2xl p-2">
                                <div className="absolute top-1/3 left-1/3 w-6 h-6 bg-white/40 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                                <span className="truncate">{drawnBall.label}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!isDrawing && !drawnBall && balls.length === 0 && (
                    <div className="text-center text-muted-foreground">
                        <Ticket size={48} className="mx-auto mb-4" />
                        <p className="font-semibold">The machine is empty!</p>
                        <p>Add some entries to start the draw.</p>
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
