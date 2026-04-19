import { useState, useCallback, useRef, useEffect } from 'react';
import { useSharedValue, useFrameCallback } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import type { NinjaItem, NinjaGameState } from './ninjaTypes';
import {
    ninjaPhysics,
    spawnItem,
    getBinForType,
    type NinjaScenario,
} from './ninjaData';

/* ------------------------------------------------------------------ */
/*  Internal types for the physics engine                              */
/* ------------------------------------------------------------------ */

/** Runtime representation of a flying item with mutable position */
interface FlyingItem {
    item: NinjaItem;
    x: number;
    y: number;
    vx: number;
    vy: number;
    spawnedAt: number;
}

export type NinjaPhase = 'ready' | 'playing' | 'summary';

export interface BladePoint {
    x: number;
    y: number;
    t: number;
}

/** Summary stats shown at end of game */
export interface NinjaSummary {
    grossSalary: number;
    netSalary: number;
    totalToState: number;
    totalToSavings: number;
    totalMissed: number;
    strikes: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MAX_STRIKES = 3;
const BLADE_TRAIL_LIFETIME_MS = 200;
const SCREEN_BOTTOM_MARGIN = 100;
/** Delay after last item cleared before transitioning to summary (ms) —
 *  allows fly-to-bin animations to complete visually. */
const END_DELAY_MS = 800;

/* ------------------------------------------------------------------ */
/*  useNinjaEngine                                                     */
/* ------------------------------------------------------------------ */

export function useNinjaEngine(scenario: NinjaScenario, screenHeight: number) {
    /* ---- Game phase & state ---- */
    const [phase, setPhase] = useState<NinjaPhase>('ready');
    const [gameState, setGameState] = useState<NinjaGameState>({
        currentGross: scenario.grossSalary,
        currentNet: scenario.grossSalary,
        activeItems: [],
        missedItems: [],
        strikes: 0,
        isGameOver: false,
    });
    const [slicedItems, setSlicedItems] = useState<NinjaItem[]>([]);
    const [summary, setSummary] = useState<NinjaSummary | null>(null);

    /* ---- Mutable refs for the game loop (no re-renders) ---- */
    const flyingRef = useRef<FlyingItem[]>([]);
    const spawnQueueRef = useRef<NinjaItem[]>([]);
    const spawnIndexRef = useRef(0);
    const lastSpawnRef = useRef(0);
    const strikesRef = useRef(0);
    const slicedRef = useRef<NinjaItem[]>([]);
    const missedRef = useRef<NinjaItem[]>([]);
    const isPlayingRef = useRef(false);
    /** Timestamp (timeSinceFirstFrame) when all items were cleared; 0 = not yet */
    const allClearedAtRef = useRef(0);

    /* ---- Blade trail (shared value for smooth rendering) ---- */
    const bladeTrail = useSharedValue<BladePoint[]>([]);

    /* ---- Reanimated frame-based game loop ---- */
    useFrameCallback((frameInfo) => {
        if (!isPlayingRef.current) return;

        const now = frameInfo.timeSinceFirstFrame;
        const { gravity, spawnIntervalMs, hitRadius } = ninjaPhysics;

        /* -- Spawn items on schedule -- */
        if (
            spawnIndexRef.current < spawnQueueRef.current.length &&
            now - lastSpawnRef.current >= spawnIntervalMs
        ) {
            const item = spawnQueueRef.current[spawnIndexRef.current];
            flyingRef.current.push({
                item,
                x: 0.5, // normalised x [0..1], screen centre
                y: 1.1, // start below screen
                vx: item.initialVelocity.x,
                vy: item.initialVelocity.y,
                spawnedAt: now,
            });
            spawnIndexRef.current += 1;
            lastSpawnRef.current = now;
        }

        /* -- Update physics for each flying item -- */
        const stillFlying: FlyingItem[] = [];
        const newlyMissed: NinjaItem[] = [];

        for (const fi of flyingRef.current) {
            fi.vy += gravity;
            fi.x += fi.vx / screenHeight; // normalise drift
            fi.y += fi.vy / screenHeight;

            const pixelY = fi.y * screenHeight;

            // Item fell below screen
            if (pixelY > screenHeight + SCREEN_BOTTOM_MARGIN) {
                newlyMissed.push(fi.item);
                continue;
            }
            stillFlying.push(fi);
        }

        flyingRef.current = stillFlying;

        /* -- Handle missed items -- */
        if (newlyMissed.length > 0) {
            missedRef.current = [...missedRef.current, ...newlyMissed];
            strikesRef.current += newlyMissed.length;

            if (strikesRef.current >= MAX_STRIKES) {
                endGame();
                return;
            }

            // Sync to React state
            syncStateFromRefs();
        }

        /* -- Check if all items spawned & cleared -- */
        if (
            spawnIndexRef.current >= spawnQueueRef.current.length &&
            flyingRef.current.length === 0
        ) {
            // Record the moment all items were cleared (sliced or missed)
            if (allClearedAtRef.current === 0) {
                allClearedAtRef.current = now;
            }
            // Wait for fly-to-bin animations to finish before ending
            if (now - allClearedAtRef.current >= END_DELAY_MS) {
                endGame();
                return;
            }
        }

        // Sync active items for rendering
        syncActiveItems();
    });

    /* ---- Sync helpers (ref → React state) ---- */
    const syncActiveItems = useCallback(() => {
        setGameState((prev) => ({
            ...prev,
            activeItems: flyingRef.current.map((fi) => fi.item),
        }));
    }, []);

    const syncStateFromRefs = useCallback(() => {
        setGameState((prev) => ({
            ...prev,
            missedItems: [...missedRef.current],
            strikes: strikesRef.current,
        }));
    }, []);

    /* ---- Slice detection (called from gesture) ---- */
    const trySliceAt = useCallback(
        (fingerX: number, fingerY: number) => {
            if (!isPlayingRef.current) return;

            const { hitRadius } = ninjaPhysics;
            const hit = flyingRef.current.find((fi) => {
                const itemPixelX = fi.x * screenHeight; // approximate, screen width ≈ height for hit check
                const itemPixelY = fi.y * screenHeight;
                const dx = fingerX - itemPixelX;
                const dy = fingerY - itemPixelY;
                return Math.sqrt(dx * dx + dy * dy) < hitRadius;
            });

            if (!hit) return;

            // Remove from flying
            flyingRef.current = flyingRef.current.filter((fi) => fi !== hit);
            slicedRef.current = [...slicedRef.current, hit.item];

            // Update net salary
            const bin = getBinForType(hit.item.type);
            setGameState((prev) => ({
                ...prev,
                currentNet: prev.currentNet - hit.item.amount,
                activeItems: flyingRef.current.map((fi) => fi.item),
            }));

            setSlicedItems([...slicedRef.current]);
        },
        [screenHeight],
    );

    /* ---- Pan gesture for slicing ---- */
    const sliceGesture = Gesture.Pan()
        .minDistance(5)
        .onUpdate((e) => {
            // Update blade trail (on UI thread via worklet, but we stay on JS for simplicity)
            const now = Date.now();
            const trail = bladeTrail.value.filter(
                (p) => now - p.t < BLADE_TRAIL_LIFETIME_MS,
            );
            trail.push({ x: e.absoluteX, y: e.absoluteY, t: now });
            bladeTrail.value = trail;

            // Hit detection
            trySliceAt(e.absoluteX, e.absoluteY);
        })
        .onEnd(() => {
            bladeTrail.value = [];
        })
        .runOnJS(true);

    /* ---- Game lifecycle ---- */
    const startGame = useCallback(() => {
        // Spawn all items from scenario
        const queue = scenario.items.map((template) => spawnItem(template));
        spawnQueueRef.current = queue;
        spawnIndexRef.current = 0;
        lastSpawnRef.current = 0;
        strikesRef.current = 0;
        slicedRef.current = [];
        missedRef.current = [];
        flyingRef.current = [];
        allClearedAtRef.current = 0;

        setGameState({
            currentGross: scenario.grossSalary,
            currentNet: scenario.grossSalary,
            activeItems: [],
            missedItems: [],
            strikes: 0,
            isGameOver: false,
        });
        setSlicedItems([]);
        setSummary(null);
        setPhase('playing');
        isPlayingRef.current = true;
    }, [scenario]);

    const endGame = useCallback(() => {
        isPlayingRef.current = false;
        setPhase('summary');

        const sliced = slicedRef.current;
        const missed = missedRef.current;

        let totalToState = 0;
        let totalToSavings = 0;
        for (const item of sliced) {
            if (getBinForType(item.type) === 'state') {
                totalToState += item.amount;
            } else {
                totalToSavings += item.amount;
            }
        }

        let totalMissed = 0;
        for (const item of missed) {
            totalMissed += item.amount;
        }

        const netSalary =
            scenario.grossSalary - totalToState - totalToSavings - totalMissed;

        setSummary({
            grossSalary: scenario.grossSalary,
            netSalary,
            totalToState,
            totalToSavings,
            totalMissed,
            strikes: strikesRef.current,
        });

        setGameState((prev) => ({
            ...prev,
            currentNet: netSalary,
            isGameOver: true,
            missedItems: [...missed],
            strikes: strikesRef.current,
        }));
    }, [scenario]);

    const resetGame = useCallback(() => {
        isPlayingRef.current = false;
        flyingRef.current = [];
        spawnQueueRef.current = [];
        strikesRef.current = 0;
        slicedRef.current = [];
        missedRef.current = [];
        allClearedAtRef.current = 0;

        setGameState({
            currentGross: scenario.grossSalary,
            currentNet: scenario.grossSalary,
            activeItems: [],
            missedItems: [],
            strikes: 0,
            isGameOver: false,
        });
        setSlicedItems([]);
        setSummary(null);
        setPhase('ready');
    }, [scenario]);

    /* ---- Cleanup on unmount ---- */
    useEffect(() => {
        return () => {
            isPlayingRef.current = false;
        };
    }, []);

    /* ---- Exposed positions for rendering (pixel coords) ---- */
    const getItemPositions = useCallback((): Array<{
        item: NinjaItem;
        pixelX: number;
        pixelY: number;
    }> => {
        return flyingRef.current.map((fi) => ({
            item: fi.item,
            pixelX: fi.x * screenHeight,
            pixelY: fi.y * screenHeight,
        }));
    }, [screenHeight]);

    return {
        phase,
        gameState,
        slicedItems,
        summary,
        bladeTrail,
        sliceGesture,
        getItemPositions,
        startGame,
        resetGame,
    };
}
