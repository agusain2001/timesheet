'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// Timer state for a single task
export interface TimerState {
    taskId: string;
    taskName: string;
    projectName?: string;
    isRunning: boolean;
    isPaused: boolean;
    startTime: Date | null;
    pausedTime: number; // accumulated paused duration in ms
    elapsedSeconds: number;
}

// Context value type
interface TimerContextValue {
    // Current active timer
    activeTimer: TimerState | null;

    // Timer controls
    startTimer: (taskId: string, taskName: string, projectName?: string) => void;
    pauseTimer: () => void;
    resumeTimer: () => void;
    stopTimer: () => Promise<void>;
    discardTimer: () => void;

    // Timer state
    isRunning: boolean;
    isPaused: boolean;
    elapsedSeconds: number;
    formattedTime: string;

    // Recent time entries
    recentEntries: TimeEntry[];
    addManualEntry: (entry: Omit<TimeEntry, 'id' | 'createdAt'>) => Promise<void>;
}

interface TimeEntry {
    id: string;
    taskId: string;
    taskName: string;
    projectName?: string;
    hours: number;
    description?: string;
    createdAt: Date;
}

const TimerContext = createContext<TimerContextValue | undefined>(undefined);

// Storage key for persisting timer state
const TIMER_STORAGE_KEY = 'lightidea_active_timer';
const ENTRIES_STORAGE_KEY = 'lightidea_recent_entries';

export function TimerProvider({ children }: { children: React.ReactNode }) {
    const [activeTimer, setActiveTimer] = useState<TimerState | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const pauseStartRef = useRef<Date | null>(null);

    // Load persisted state on mount
    useEffect(() => {
        const savedTimer = localStorage.getItem(TIMER_STORAGE_KEY);
        const savedEntries = localStorage.getItem(ENTRIES_STORAGE_KEY);

        if (savedTimer) {
            try {
                const parsed = JSON.parse(savedTimer);
                parsed.startTime = parsed.startTime ? new Date(parsed.startTime) : null;
                setActiveTimer(parsed);

                // Calculate elapsed time if timer was running
                if (parsed.isRunning && parsed.startTime) {
                    const now = Date.now();
                    const elapsed = Math.floor(
                        (now - new Date(parsed.startTime).getTime() - (parsed.pausedTime || 0)) / 1000
                    );
                    setElapsedSeconds(Math.max(0, elapsed));
                } else {
                    setElapsedSeconds(parsed.elapsedSeconds || 0);
                }
            } catch (e) {
                console.error('Failed to restore timer state:', e);
            }
        }

        if (savedEntries) {
            try {
                const parsed = JSON.parse(savedEntries);
                setRecentEntries(parsed.map((e: any) => ({
                    ...e,
                    createdAt: new Date(e.createdAt)
                })));
            } catch (e) {
                console.error('Failed to restore entries:', e);
            }
        }
    }, []);

    // Persist timer state
    useEffect(() => {
        if (activeTimer) {
            localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
                ...activeTimer,
                elapsedSeconds
            }));
        } else {
            localStorage.removeItem(TIMER_STORAGE_KEY);
        }
    }, [activeTimer, elapsedSeconds]);

    // Persist recent entries
    useEffect(() => {
        localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(recentEntries.slice(0, 50)));
    }, [recentEntries]);

    // Timer tick effect
    useEffect(() => {
        if (activeTimer?.isRunning && !activeTimer.isPaused) {
            intervalRef.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [activeTimer?.isRunning, activeTimer?.isPaused]);

    // Start a new timer
    const startTimer = useCallback((taskId: string, taskName: string, projectName?: string) => {
        // Stop any existing timer first
        if (activeTimer?.isRunning) {
            console.warn('Stopping existing timer before starting new one');
        }

        setActiveTimer({
            taskId,
            taskName,
            projectName,
            isRunning: true,
            isPaused: false,
            startTime: new Date(),
            pausedTime: 0,
            elapsedSeconds: 0
        });
        setElapsedSeconds(0);
    }, [activeTimer]);

    // Pause the timer
    const pauseTimer = useCallback(() => {
        if (activeTimer && activeTimer.isRunning && !activeTimer.isPaused) {
            pauseStartRef.current = new Date();
            setActiveTimer(prev => prev ? {
                ...prev,
                isPaused: true,
                elapsedSeconds
            } : null);
        }
    }, [activeTimer, elapsedSeconds]);

    // Resume the timer
    const resumeTimer = useCallback(() => {
        if (activeTimer && activeTimer.isPaused && pauseStartRef.current) {
            const pauseDuration = Date.now() - pauseStartRef.current.getTime();
            pauseStartRef.current = null;

            setActiveTimer(prev => prev ? {
                ...prev,
                isPaused: false,
                pausedTime: (prev.pausedTime || 0) + pauseDuration
            } : null);
        }
    }, [activeTimer]);

    // Stop timer and save entry
    const stopTimer = useCallback(async () => {
        if (!activeTimer) return;

        const hours = elapsedSeconds / 3600;

        // Create time entry
        const entry: TimeEntry = {
            id: `entry_${Date.now()}`,
            taskId: activeTimer.taskId,
            taskName: activeTimer.taskName,
            projectName: activeTimer.projectName,
            hours: Math.round(hours * 100) / 100,
            createdAt: new Date()
        };

        // Save to API
        try {
            const token = localStorage.getItem('token');
            await fetch('/api/timesheets/entries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    task_id: activeTimer.taskId,
                    hours: entry.hours,
                    description: `Timer entry for ${activeTimer.taskName}`,
                    date: new Date().toISOString().split('T')[0]
                })
            });
        } catch (error) {
            console.error('Failed to save time entry:', error);
        }

        // Add to recent entries
        setRecentEntries(prev => [entry, ...prev].slice(0, 50));

        // Clear timer
        setActiveTimer(null);
        setElapsedSeconds(0);
    }, [activeTimer, elapsedSeconds]);

    // Discard timer without saving
    const discardTimer = useCallback(() => {
        setActiveTimer(null);
        setElapsedSeconds(0);
    }, []);

    // Add manual time entry
    const addManualEntry = useCallback(async (entry: Omit<TimeEntry, 'id' | 'createdAt'>) => {
        const newEntry: TimeEntry = {
            ...entry,
            id: `entry_${Date.now()}`,
            createdAt: new Date()
        };

        // Save to API
        try {
            const token = localStorage.getItem('token');
            await fetch('/api/timesheets/entries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    task_id: entry.taskId,
                    hours: entry.hours,
                    description: entry.description,
                    date: new Date().toISOString().split('T')[0]
                })
            });
        } catch (error) {
            console.error('Failed to save time entry:', error);
            throw error;
        }

        setRecentEntries(prev => [newEntry, ...prev].slice(0, 50));
    }, []);

    // Format elapsed time as HH:MM:SS
    const formattedTime = React.useMemo(() => {
        const hrs = Math.floor(elapsedSeconds / 3600);
        const mins = Math.floor((elapsedSeconds % 3600) / 60);
        const secs = elapsedSeconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, [elapsedSeconds]);

    const value: TimerContextValue = {
        activeTimer,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        discardTimer,
        isRunning: activeTimer?.isRunning ?? false,
        isPaused: activeTimer?.isPaused ?? false,
        elapsedSeconds,
        formattedTime,
        recentEntries,
        addManualEntry
    };

    return (
        <TimerContext.Provider value={value}>
            {children}
        </TimerContext.Provider>
    );
}

// Hook to use timer context
export function useTimer() {
    const context = useContext(TimerContext);
    if (context === undefined) {
        throw new Error('useTimer must be used within a TimerProvider');
    }
    return context;
}

// Format seconds to human-readable duration
export function formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
        return `${hrs}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
        return `${mins}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}
