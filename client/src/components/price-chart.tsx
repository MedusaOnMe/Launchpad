import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface PriceChartProps {
  tokenId: number;
}

export function PriceChart({ tokenId }: PriceChartProps) {
  // Generate mock price data based on tokenId for consistency
  const data = useMemo(() => {
    const points = 50;
    const basePrice = 0.00234 + (tokenId * 0.0001);
    const mockData = [];
    
    let price = basePrice;
    for (let i = 0; i < points; i++) {
      // Create realistic price movement with some volatility
      const change = (Math.random() - 0.5) * 0.0002;
      const trend = Math.sin(i / 10) * 0.0001; // Add trending pattern
      price = Math.max(0.00001, price + change + trend);
      
      mockData.push({
        time: new Date(Date.now() - (points - i) * 60000).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        price: parseFloat(price.toFixed(6)),
      });
    }
    
    return mockData;
  }, [tokenId]);

  const currentPrice = data[data.length - 1]?.price || 0;
  const previousPrice = data[data.length - 2]?.price || currentPrice;
  const isPositive = currentPrice >= previousPrice;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis 
            dataKey="time" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#9CA3AF' }}
            interval="preserveStartEnd"
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#9CA3AF' }}
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => value.toFixed(6)}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              color: 'hsl(var(--foreground))',
            }}
            formatter={(value: number) => [`${value.toFixed(6)} SOL`, 'Price']}
            labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={isPositive ? '#39FF14' : '#FF6B35'}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: '#FF6B35', strokeWidth: 2, fill: '#FF6B35' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
