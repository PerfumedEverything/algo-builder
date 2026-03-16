"use client"

type BackgroundPlusProps = {
  className?: string
  plusColor?: string
  plusSize?: number
  fade?: boolean
}

export const BackgroundPlus = ({
  className = "",
  plusColor = "#3b82f6",
  plusSize = 60,
  fade = true,
}: BackgroundPlusProps) => {
  return (
    <div className={`pointer-events-none overflow-hidden ${className}`}>
      <svg
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {fade && (
          <defs>
            <radialGradient id="bg-plus-fade" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
            <mask id="bg-plus-mask">
              <rect width="100%" height="100%" fill="url(#bg-plus-fade)" />
            </mask>
          </defs>
        )}
        <g mask={fade ? "url(#bg-plus-mask)" : undefined}>
          <pattern
            id="bg-plus-pattern"
            x="0"
            y="0"
            width={plusSize}
            height={plusSize}
            patternUnits="userSpaceOnUse"
          >
            <line
              x1={plusSize / 2}
              y1={plusSize / 2 - plusSize * 0.1}
              x2={plusSize / 2}
              y2={plusSize / 2 + plusSize * 0.1}
              stroke={plusColor}
              strokeWidth="1"
            />
            <line
              x1={plusSize / 2 - plusSize * 0.1}
              y1={plusSize / 2}
              x2={plusSize / 2 + plusSize * 0.1}
              y2={plusSize / 2}
              stroke={plusColor}
              strokeWidth="1"
            />
          </pattern>
          <rect width="100%" height="100%" fill="url(#bg-plus-pattern)" />
        </g>
      </svg>
    </div>
  )
}
