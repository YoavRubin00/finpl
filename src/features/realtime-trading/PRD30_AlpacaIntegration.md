# PRD 30: Real-Time Trading Hub (Phase 8)

## Overview
To provide absolute value and connect theoretical knowledge to the real world, FinPlay will include a real-time trading simulator using the Alpaca API. This feature allows users to paper-trade real stocks (starting with AAPL as a Proof of Concept) using the in-game economy.

## Goal
Build a React Native component that connects to the Alpaca Market Data API to fetch live AAPL pricing, renders it on a chart, and allows the user to execute mock "Buy/Sell" orders.

## Technical Implementation Guide: Alpaca API

### 1. API Keys & Security
- **Endpoints:** `https://paper-api.alpaca.markets` (for paper trading/account endpoints) and `https://data.alpaca.markets` (for market data).
- **Security:** Do NOT hardcode keys in the frontend. Keys must be handled via `.env` files (e.g., `EXPO_PUBLIC_ALPACA_KEY`, `EXPO_PUBLIC_ALPACA_SECRET`).

### 2. Fetching Real-Time Stock Data (React Native Component Example)

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

const ALPACA_API_KEY = process.env.EXPO_PUBLIC_ALPACA_KEY;
const ALPACA_SECRET_KEY = process.env.EXPO_PUBLIC_ALPACA_SECRET;

export const LiveTradingSim = ({ symbol = 'AAPL' }) => {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestQuote = async () => {
      try {
        const response = await fetch(
          `https://data.alpaca.markets/v2/stocks/${symbol}/quotes/latest`,
          {
            headers: {
              'APCA-API-KEY-ID': ALPACA_API_KEY || '',
              'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY || '',
            },
          }
        );
        const data = await response.json();
        
        if (data && data.quote && data.quote.ap) {
          setPrice(data.quote.ap); // ap = ask price
        }
      } catch (error) {
        console.error("Failed to fetch Alpaca data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestQuote();
    
    // Polling every 10 seconds for real-time updates (can be replaced with WebSockets later)
    const interval = setInterval(fetchLatestQuote, 10000);
    return () => clearInterval(interval);
  }, [symbol]);

  if (loading) return <ActivityIndicator size="large" />;

  return (
    <View style={styles.container}>
      <Text style={styles.symbol}>{symbol}</Text>
      <Text style={styles.price}>${price?.toFixed(2)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center', backgroundColor: '#1E1E1E', borderRadius: 12 },
  symbol: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  price: { color: '#4ADE80', fontSize: 32, fontWeight: '900', marginTop: 10 }
});
```

### 3. User Flow
- User enters the "Trading Hub" from the Pyramid or Shop.
- User sees the live chart (later refactored to use Skia Tactile Graphs from PRD 29).
- User can hit "BUY" using their in-game Coins to purchase fractional shares.
- The portfolio value fluctuates based on the live Alpaca API data.

## Execution Rules
- Must be built as a standalone component first (`LiveTradingSim.tsx`) before integrating into the main app flow.
- Ensure proper error handling if the Alpaca API limits are reached.
