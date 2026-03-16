import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center">
      <div className="relative select-none">
        <h1 className="glitch text-[120px] font-black leading-none tracking-tighter text-foreground sm:text-[180px]" data-text="404">
          404
        </h1>
      </div>
      <p className="mt-4 text-lg text-muted-foreground">Страница не найдена</p>
      <p className="mt-1 text-sm text-muted-foreground/60">Возможно, она была удалена или вы ошиблись в адресе</p>
      <Button asChild className="mt-8">
        <Link href="/dashboard">На главную</Link>
      </Button>

      <style>{`
        .glitch {
          position: relative;
          animation: glitch-shift 3s infinite;
        }
        .glitch::before,
        .glitch::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        .glitch::before {
          color: hsl(var(--foreground));
          animation: glitch-top 2.5s infinite;
          clip-path: polygon(0 0, 100% 0, 100% 33%, 0 33%);
        }
        .glitch::after {
          color: hsl(var(--foreground));
          animation: glitch-bottom 3s infinite;
          clip-path: polygon(0 67%, 100% 67%, 100% 100%, 0 100%);
        }
        @keyframes glitch-top {
          0%, 90%, 100% { transform: translate(0); }
          92% { transform: translate(-8px, -2px); }
          94% { transform: translate(8px, 2px); }
          96% { transform: translate(-4px, -1px); }
          98% { transform: translate(4px, 1px); }
        }
        @keyframes glitch-bottom {
          0%, 88%, 100% { transform: translate(0); }
          90% { transform: translate(6px, 1px); }
          93% { transform: translate(-6px, -1px); }
          95% { transform: translate(3px, 2px); }
          97% { transform: translate(-3px, -2px); }
        }
        @keyframes glitch-shift {
          0%, 85%, 100% { transform: translate(0); opacity: 1; }
          86% { transform: translate(-2px, 0); }
          87% { transform: translate(2px, 0); opacity: 0.8; }
          88% { transform: translate(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
