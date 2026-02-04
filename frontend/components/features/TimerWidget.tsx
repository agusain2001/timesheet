'use client';

import React, { useState } from 'react';
import { useTimer, formatDuration } from '@/contexts/TimerContext';
import { Play, Pause, Square, Clock, X, ChevronDown, ChevronUp } from 'lucide-react';

interface TimerWidgetProps {
    compact?: boolean;
    className?: string;
}

export function TimerWidget({ compact = false, className = '' }: TimerWidgetProps) {
    const {
        activeTimer,
        isRunning,
        isPaused,
        formattedTime,
        elapsedSeconds,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        discardTimer,
        recentEntries
    } = useTimer();

    const [showRecent, setShowRecent] = useState(false);
    const [confirmDiscard, setConfirmDiscard] = useState(false);

    // Handle stop with confirmation
    const handleStop = async () => {
        if (elapsedSeconds < 60) {
            // Less than 1 minute - confirm discard
            setConfirmDiscard(true);
        } else {
            await stopTimer();
        }
    };

    const handleConfirmDiscard = () => {
        discardTimer();
        setConfirmDiscard(false);
    };

    if (compact) {
        // Compact version for header/sidebar
        return (
            <div className={`timer-widget-compact ${className}`}>
                {activeTimer ? (
                    <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg px-3 py-2 border border-blue-500/30">
                        <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-400' : 'bg-green-400 animate-pulse'}`} />
                        <span className="font-mono text-sm font-medium">{formattedTime}</span>
                        <span className="text-xs text-gray-400 truncate max-w-[100px]">{activeTimer.taskName}</span>
                        <div className="flex gap-1">
                            {isPaused ? (
                                <button
                                    onClick={resumeTimer}
                                    className="p-1 hover:bg-green-500/20 rounded transition-colors"
                                    title="Resume"
                                >
                                    <Play className="w-3.5 h-3.5 text-green-400" />
                                </button>
                            ) : (
                                <button
                                    onClick={pauseTimer}
                                    className="p-1 hover:bg-yellow-500/20 rounded transition-colors"
                                    title="Pause"
                                >
                                    <Pause className="w-3.5 h-3.5 text-yellow-400" />
                                </button>
                            )}
                            <button
                                onClick={handleStop}
                                className="p-1 hover:bg-red-500/20 rounded transition-colors"
                                title="Stop"
                            >
                                <Square className="w-3.5 h-3.5 text-red-400" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs">No active timer</span>
                    </div>
                )}
            </div>
        );
    }

    // Full version
    return (
        <div className={`timer-widget bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-700/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-400" />
                        <h3 className="font-medium">Time Tracker</h3>
                    </div>
                    {activeTimer && (
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${isPaused
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-green-500/20 text-green-400'
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-yellow-400' : 'bg-green-400 animate-pulse'}`} />
                            {isPaused ? 'Paused' : 'Running'}
                        </div>
                    )}
                </div>
            </div>

            {/* Timer Display */}
            <div className="p-6">
                {activeTimer ? (
                    <>
                        {/* Task info */}
                        <div className="text-center mb-4">
                            <div className="text-sm text-gray-400">Tracking time for</div>
                            <div className="font-medium text-lg truncate">{activeTimer.taskName}</div>
                            {activeTimer.projectName && (
                                <div className="text-sm text-blue-400">{activeTimer.projectName}</div>
                            )}
                        </div>

                        {/* Timer display */}
                        <div className="text-center mb-6">
                            <div className="font-mono text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                {formattedTime}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                                {formatDuration(elapsedSeconds)}
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex justify-center gap-3">
                            {isPaused ? (
                                <button
                                    onClick={resumeTimer}
                                    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors"
                                >
                                    <Play className="w-5 h-5" />
                                    Resume
                                </button>
                            ) : (
                                <button
                                    onClick={pauseTimer}
                                    className="flex items-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-medium transition-colors"
                                >
                                    <Pause className="w-5 h-5" />
                                    Pause
                                </button>
                            )}
                            <button
                                onClick={handleStop}
                                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-colors"
                            >
                                <Square className="w-5 h-5" />
                                Stop
                            </button>
                        </div>

                        {/* Discard confirmation */}
                        {confirmDiscard && (
                            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <p className="text-sm text-center text-red-400 mb-2">
                                    Less than 1 minute tracked. Discard or save anyway?
                                </p>
                                <div className="flex justify-center gap-2">
                                    <button
                                        onClick={handleConfirmDiscard}
                                        className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 rounded transition-colors"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        onClick={async () => {
                                            await stopTimer();
                                            setConfirmDiscard(false);
                                        }}
                                        className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-500 rounded transition-colors"
                                    >
                                        Save Anyway
                                    </button>
                                    <button
                                        onClick={() => setConfirmDiscard(false)}
                                        className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-8">
                        <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400 mb-2">No active timer</p>
                        <p className="text-sm text-gray-500">
                            Start a timer from any task to track your time
                        </p>
                    </div>
                )}
            </div>

            {/* Recent Entries */}
            {recentEntries.length > 0 && (
                <div className="border-t border-gray-700/50">
                    <button
                        onClick={() => setShowRecent(!showRecent)}
                        className="w-full px-4 py-2 flex items-center justify-between text-sm text-gray-400 hover:bg-gray-700/30 transition-colors"
                    >
                        <span>Recent Entries ({recentEntries.length})</span>
                        {showRecent ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showRecent && (
                        <div className="max-h-48 overflow-y-auto">
                            {recentEntries.slice(0, 10).map((entry) => (
                                <div
                                    key={entry.id}
                                    className="px-4 py-2 border-t border-gray-700/30 hover:bg-gray-700/20"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="truncate">
                                            <div className="text-sm font-medium">{entry.taskName}</div>
                                            {entry.projectName && (
                                                <div className="text-xs text-gray-500">{entry.projectName}</div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-mono text-blue-400">
                                                {entry.hours.toFixed(2)}h
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(entry.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Timer button for task cards
interface TimerButtonProps {
    taskId: string;
    taskName: string;
    projectName?: string;
    size?: 'sm' | 'md';
}

export function TimerButton({ taskId, taskName, projectName, size = 'md' }: TimerButtonProps) {
    const { activeTimer, isRunning, isPaused, startTimer, pauseTimer, resumeTimer, stopTimer } = useTimer();

    const isThisTask = activeTimer?.taskId === taskId;

    if (isThisTask) {
        return (
            <div className="flex items-center gap-1">
                {isPaused ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            resumeTimer();
                        }}
                        className={`p-${size === 'sm' ? '1' : '2'} bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors`}
                        title="Resume timer"
                    >
                        <Play className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-green-400`} />
                    </button>
                ) : (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            pauseTimer();
                        }}
                        className={`p-${size === 'sm' ? '1' : '2'} bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg transition-colors`}
                        title="Pause timer"
                    >
                        <Pause className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-yellow-400`} />
                    </button>
                )}
                <button
                    onClick={async (e) => {
                        e.stopPropagation();
                        await stopTimer();
                    }}
                    className={`p-${size === 'sm' ? '1' : '2'} bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors`}
                    title="Stop timer"
                >
                    <Square className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-red-400`} />
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                startTimer(taskId, taskName, projectName);
            }}
            className={`p-${size === 'sm' ? '1' : '2'} hover:bg-blue-500/20 rounded-lg transition-colors group`}
            title="Start timer"
        >
            <Play className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-gray-400 group-hover:text-blue-400`} />
        </button>
    );
}
