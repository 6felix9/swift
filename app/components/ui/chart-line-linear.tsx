"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export const description = "A conversation effectiveness line chart"

interface ChartData {
  turn: number;
  score: number;
}

interface ChartLineLinearProps {
  className?: string;
  data?: ChartData[];
}

const chartConfig = {
  score: {
    label: "Effectiveness Score",
    color: "#00A9E7", // Use app's primary blue color
  },
} satisfies ChartConfig

export function ChartLineLinear({ className, data = [] }: ChartLineLinearProps) {
  const chartData = data.length > 0 ? data : [{ turn: 0, score: 0 }];

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-[#00A9E7] flex items-center gap-2">
          <div className="w-2 h-2 bg-[#00A9E7] rounded-full animate-pulse"></div>
          Conversation Effectiveness
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid 
              vertical={false} 
              stroke="rgba(0, 169, 231, 0.2)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="turn"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              label={{ 
                value: 'Conversation Turn', 
                position: 'insideBottom', 
                offset: -10,
                style: { textAnchor: 'middle', fill: '#64748b', fontSize: '12px', fontWeight: 500 }
              }}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              label={{ 
                value: 'Effectiveness Score (0-100)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#64748b', fontSize: '12px', fontWeight: 500 }
              }}
            />
            <ChartTooltip
              cursor={{
                stroke: '#00A9E7',
                strokeWidth: 1,
                strokeDasharray: '5 5'
              }}
              content={<ChartTooltipContent 
                formatter={(value) => [`${value}/100`, " Effectiveness Score"]}
                labelFormatter={(value) => `Turn ${value}`}
                className="bg-[#001425]/95 border border-[#00A9E7]/50 text-white shadow-lg"
              />}
            />
            <Line
              dataKey="score"
              type="linear"
              stroke="#00A9E7"
              strokeWidth={3}
              dot={{
                fill: "#00A9E7",
                strokeWidth: 2,
                stroke: "#ffffff",
                r: 4
              }}
              activeDot={{
                r: 6,
                fill: "#FFB800",
                stroke: "#ffffff",
                strokeWidth: 2
              }}
              animationDuration={500}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
