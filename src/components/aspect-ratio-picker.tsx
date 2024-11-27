'use client'

import { Button } from "@/components/ui/button"
import { RectangleHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

type AspectRatioOption = {
  label: string
  value: [width: number, height: number] // width/height
}

const aspectRatios: AspectRatioOption[] = [
    { label: "Square (1:1)", value: [1, 1] },
    { label: "Landscape (4:3)", value: [4, 3] },
    { label: "Portrait (3:4)", value: [3, 4] },
    { label: "Widescreen (16:9)", value: [16, 9] },
    { label: "Portrait (9:16)", value: [9, 16] },
    { label: "Cinematic (2:1)", value: [2, 1] },
    { label: "Portrait (1:2)", value: [1, 2] },
  ];

interface AspectRatioPickerProps {
  value: [width: number, height: number]
  onChange: (ratio: [width: number, height: number]) => void
}

export function AspectRatioPicker({ value, onChange }: AspectRatioPickerProps) {
  return (
    <div className="p-4 rounded-lg bg-black/40 backdrop-blur-sm border border-zinc-800/50">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
          <RectangleHorizontal className="w-4 h-4" />
          <span>Aspect Ratio</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {aspectRatios.map((ratio) => (
            <Button
              key={ratio.label}
              variant="outline"
              size="sm"
              className={cn(
                "border-zinc-800/50 bg-zinc-900/20",
                value[0] === ratio.value[0] && value[1] === ratio.value[1] && "border-violet-500 bg-violet-500/10"
              )}
              onClick={() => onChange(ratio.value)}
            >
              {ratio.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
} 