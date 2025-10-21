"use client";

import { useEffect, useRef, useState, useMemo } from 'react';
import Matter from 'matter-js';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Ball } from '../../app/lucky-draw-page';

interface PhysicsContainerProps {
  balls: Ball[];
  isShaking: boolean;
  deletingBallIds: string[]; 
}

type RenderBall = Ball & {
  x: number;
  y: number;
  angle: number;
};

const PhysicsContainer = ({ balls, isShaking, deletingBallIds }: PhysicsContainerProps) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef(Matter.Engine.create());
  const runnerRef = useRef(Matter.Runner.create());
  const [renderedBalls, setRenderedBalls] = useState<RenderBall[]>([]);
  const ballsRef = useRef(balls);
  const [isAnimating, setIsAnimating] = useState(false);
  const topWallRef = useRef<Matter.Body | null>(null);

  useEffect(() => {
    ballsRef.current = balls;
  }, [balls]);

  useEffect(() => {
    const engine = engineRef.current;
    const world = engine.world;
    const runner = runnerRef.current;
    
    engine.world.gravity.y = 1;
    engine.enableSleeping = true;

    const element = sceneRef.current;
    if (!element) return;

    const { offsetWidth: width, offsetHeight: height } = element;

    const boundaries = [
      Matter.Bodies.rectangle(width / 2, height + 10, width, 20, { isStatic: true, label: 'bottom-wall' }),
      Matter.Bodies.rectangle(-10, height / 2, 20, height, { isStatic: true, label: 'left-wall' }),
      Matter.Bodies.rectangle(width + 10, height / 2, 20, height, { isStatic: true, label: 'right-wall' }),
    ];
    
    topWallRef.current = Matter.Bodies.rectangle(width / 2, -10, width, 20, { isStatic: true, label: 'top-wall' });
    Matter.World.add(world, [...boundaries, topWallRef.current]);
    
    Matter.Runner.run(runner, engine);

    const renderLoop = () => {
      if (!engine.world) return;
      const allBodies = Matter.Composite.allBodies(engine.world);
      
      allBodies.forEach(body => {
          const maxSpeed = 20;
          if (body.velocity.x > maxSpeed) Matter.Body.setVelocity(body, { x: maxSpeed, y: body.velocity.y });
          if (body.velocity.x < -maxSpeed) Matter.Body.setVelocity(body, { x: -maxSpeed, y: body.velocity.y });
          if (body.velocity.y > maxSpeed) Matter.Body.setVelocity(body, { x: body.velocity.x, y: maxSpeed });
          if (body.velocity.y < -maxSpeed) Matter.Body.setVelocity(body, { x: body.velocity.x, y: -maxSpeed });
      });

      const currentBalls = allBodies
        .map(body => {
          const ballData = ballsRef.current?.find(b => `ball-${b.id}` === body.label);
          if (!ballData) return null;
          return { ...ballData, x: body.position.x, y: body.position.y, angle: body.angle };
        })
        .filter((ball): ball is RenderBall => ball !== null);
      setRenderedBalls(currentBalls);
      requestAnimationFrame(renderLoop);
    };
    renderLoop();

    return () => {
      Matter.Runner.stop(runner);
      if (engine.world) { Matter.World.clear(engine.world, false); }
      Matter.Engine.clear(engine);
    };
  }, []);

  useEffect(() => {
    if(!engineRef.current.world) return;
    const world = engineRef.current.world;
    const allBodies = Matter.Composite.allBodies(world);
    const existingBodyLabels = allBodies.map(b => b.label);
    const ballLabels = balls.map(b => `ball-${b.id}`);
    
    let hasNewBalls = false;
    balls.forEach(ball => {
      const ballLabel = `ball-${ball.id}`;
      if (!existingBodyLabels.includes(ballLabel)) {
        hasNewBalls = true;
        const element = sceneRef.current;
        if (!element) return;
        const { offsetWidth: width } = element;
        const newBallBody = Matter.Bodies.circle(
          Math.random() * (width - 56) + 28, -30, 28,
          { label: ballLabel, restitution: 0.6, friction: 0.1, density: 0.05, sleepThreshold: 60 }
        );
        Matter.World.add(world, newBallBody);
      }
    });

    if (hasNewBalls && topWallRef.current) {
        Matter.World.remove(world, topWallRef.current);
        // [수정] 상단 벽이 다시 생기는 시간을 2.5초로 늘려 공이 충분히 들어올 시간을 줍니다.
        setTimeout(() => {
            if (topWallRef.current && !world.bodies.includes(topWallRef.current)) {
                Matter.World.add(world, topWallRef.current);
            }
        }, 2500);
    }

    const bodiesToRemove = allBodies.filter(body => body.label.startsWith('ball-') && !ballLabels.includes(body.label));
    if (bodiesToRemove.length > 0) {
        Matter.World.remove(world, bodiesToRemove);
    }
  }, [balls]);

  useEffect(() => {
    if (isShaking) {
      if(!engineRef.current.world) return;
      const allBodies = Matter.Composite.allBodies(engineRef.current.world);
      const element = sceneRef.current;
      if (!element) return;
      const { offsetWidth: width, offsetHeight: height } = element;
      const explosionCenter = { x: width / 2, y: height / 2 };

      allBodies.forEach(body => {
        if (body.label.startsWith('ball-')) {
            Matter.Sleeping.set(body, false);
            const direction = Matter.Vector.sub(body.position, explosionCenter);
            const distance = Matter.Vector.magnitude(direction) || 1;
            const velocityMagnitude = 30 / Math.sqrt(distance); 
            Matter.Body.setVelocity(body, {
                x: (direction.x / distance) * velocityMagnitude + (Math.random() - 0.5) * 5,
                y: (direction.y / distance) * velocityMagnitude + (Math.random() - 0.5) * 5,
            });
        }
      });
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500); 
      return () => clearTimeout(timer);
    }
  }, [isShaking]);

  return (
    <TooltipProvider>
      <div 
        ref={sceneRef} 
        className={cn( "absolute inset-0 w-full h-full overflow-hidden", isAnimating && "animate-shake" )}
      >
        {renderedBalls.map((ball) => (
          <Tooltip key={ball.id} delayDuration={100}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "absolute flex items-center justify-center w-14 h-14 rounded-full text-white font-bold text-lg shadow-lg",
                  "transform -translate-x-1/2 -translate-y-1/2",
                  deletingBallIds.includes(ball.id) && "animate-blink-out"
                )}
                style={{
                  left: ball.x,
                  top: ball.y,
                  backgroundColor: ball.color,
                  transform: `translate(-50%, -50%) rotate(${ball.angle}rad)`,
                }}
              >
                <div className="absolute top-1/3 left-1/3 w-2.5 h-2.5 bg-white/40 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                <span className="truncate px-1 text-sm">{ball.number}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-left">
                  <p className="font-bold">{ball.number}번 {ball.name}</p>
                  <p>{ball.prize}</p>
                  <p className="text-xs text-muted-foreground">{ball.addedAt}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default PhysicsContainer;

