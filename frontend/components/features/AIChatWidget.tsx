"use client";

import { useState, useRef, useEffect } from "react";
import {
    chatWithAI,
    getAIInsights,
    AIInsight,
} from "@/services/ai";

// =============== Icons ===============

const SendIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);

const SparklesIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

const LightBulbIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);

const AlertIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const TrendingIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

// =============== Components ===============

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    actions?: Array<{
        type: string;
        entity_id: string;
        description: string;
    }>;
}

interface ChatMessageProps {
    message: Message;
}

function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === "user";

    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] ${isUser ? "order-2" : "order-1"}`}>
                <div
                    className={`rounded-2xl px-4 py-3 ${isUser
                            ? "bg-blue-600 text-white"
                            : "bg-foreground/10 text-foreground"
                        }`}
                >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.actions && message.actions.length > 0 && (
                    <div className="mt-2 space-y-1">
                        {message.actions.map((action, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {action.description}
                            </div>
                        ))}
                    </div>
                )}
                <p className={`text-xs text-foreground/40 mt-1 ${isUser ? "text-right" : ""}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
            </div>
        </div>
    );
}

interface InsightCardProps {
    insight: AIInsight;
    onDismiss: (id: string) => void;
}

function InsightCard({ insight, onDismiss }: InsightCardProps) {
    const icons = {
        risk: <AlertIcon />,
        opportunity: <LightBulbIcon />,
        recommendation: <SparklesIcon />,
        trend: <TrendingIcon />,
    };

    const colors = {
        info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        warning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        critical: "bg-red-500/20 text-red-400 border-red-500/30",
    };

    return (
        <div className={`p-4 rounded-xl border ${colors[insight.severity]} relative group`}>
            <button
                onClick={() => onDismiss(insight.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-foreground/10 rounded transition-all"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <div className="flex items-start gap-3">
                <div className="mt-0.5">{icons[insight.type]}</div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground text-sm">{insight.title}</h4>
                    <p className="text-xs text-foreground/60 mt-1">{insight.description}</p>
                    {insight.actions && insight.actions.length > 0 && (
                        <div className="flex gap-2 mt-3">
                            {insight.actions.map((action, idx) => (
                                <button
                                    key={idx}
                                    className="px-3 py-1 text-xs bg-foreground/10 hover:bg-foreground/20 rounded-lg transition-colors"
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const suggestedPrompts = [
    "What are my highest priority tasks this week?",
    "Show me overdue tasks across all projects",
    "Create a task: Review API documentation by Friday",
    "What's the status of the mobile app project?",
    "Who has the most tasks assigned right now?",
    "Generate a weekly status update for my team",
];

// =============== Main Component ===============

interface AIChatWidgetProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AIChatWidget({ isOpen, onClose }: AIChatWidgetProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "Hi! I'm your AI project assistant. I can help you manage tasks, get insights, and answer questions about your projects. How can I help you today?",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [conversationId, setConversationId] = useState<string | undefined>();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Load insights
            getAIInsights({ limit: 5 }).then(setInsights).catch(() => {
                // Mock insights for demo
                setInsights([
                    {
                        id: "1",
                        type: "risk",
                        title: "3 tasks overdue",
                        description: "You have 3 tasks that are past their due date. Consider rescheduling or delegating.",
                        severity: "warning",
                        created_at: new Date().toISOString(),
                    },
                    {
                        id: "2",
                        type: "recommendation",
                        title: "Optimize workload",
                        description: "Team member John is overloaded. Consider redistributing 2 tasks to Jane.",
                        severity: "info",
                        actions: [{ label: "Redistribute", action_type: "redistribute", params: {} }],
                        created_at: new Date().toISOString(),
                    },
                ]);
            });
        }
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            const response = await chatWithAI(userMessage.content, conversationId);
            setConversationId(response.conversation_id);

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: response.response,
                timestamp: new Date(),
                actions: response.actions_taken,
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Failed to get AI response:", error);
            // Mock response for demo
            const mockResponses: Record<string, string> = {
                priority: "Based on your current workload, here are your highest priority tasks:\n\n1. **API Documentation Review** - Due tomorrow, high priority\n2. **Fix login bug** - Urgent, assigned by PM\n3. **Update user dashboard** - Due in 3 days\n\nWould you like me to help you schedule time for these?",
                overdue: "You have 3 overdue tasks:\n\n1. **Database migration** - 2 days overdue\n2. **Unit tests for auth module** - 1 day overdue\n3. **Performance optimization** - 5 days overdue\n\nWould you like me to help reschedule these or mark any as complete?",
                create: "I've created a new task:\n\n📋 **Review API documentation**\n- Due: Friday\n- Priority: Medium\n- Project: Backend API\n\nIs there anything else you'd like me to add to this task?",
                default: "I understand you're asking about your projects. Let me help you with that. Could you be more specific about what you'd like to know? I can help with:\n\n• Task management and prioritization\n• Project status updates\n• Workload analysis\n• Creating or updating tasks",
            };

            const content = input.toLowerCase().includes("priority") ? mockResponses.priority :
                input.toLowerCase().includes("overdue") ? mockResponses.overdue :
                    input.toLowerCase().includes("create") ? mockResponses.create :
                        mockResponses.default;

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content,
                timestamp: new Date(),
                actions: input.toLowerCase().includes("create") ? [
                    { type: "task_created", entity_id: "new-task-1", description: "Created task: Review API documentation" }
                ] : undefined,
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestion = (prompt: string) => {
        setInput(prompt);
    };

    const handleDismissInsight = (id: string) => {
        setInsights((prev) => prev.filter((i) => i.id !== id));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-4 right-4 w-[400px] h-[600px] bg-background border border-foreground/10 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                        <SparklesIcon />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground text-sm">AI Assistant</h3>
                        <p className="text-xs text-foreground/50">Powered by AI</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-foreground/10 rounded-lg transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Insights (collapsible) */}
            {insights.length > 0 && (
                <div className="px-4 py-3 border-b border-foreground/10 max-h-40 overflow-y-auto space-y-2">
                    {insights.map((insight) => (
                        <InsightCard
                            key={insight.id}
                            insight={insight}
                            onDismiss={handleDismissInsight}
                        />
                    ))}
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-foreground/10 rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {messages.length <= 2 && (
                <div className="px-4 pb-2">
                    <p className="text-xs text-foreground/50 mb-2">Try asking:</p>
                    <div className="flex flex-wrap gap-2">
                        {suggestedPrompts.slice(0, 3).map((prompt, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSuggestion(prompt)}
                                className="px-3 py-1.5 text-xs bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 rounded-full transition-colors"
                            >
                                {prompt.length > 35 ? prompt.slice(0, 35) + "..." : prompt}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-foreground/10">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask me anything..."
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-xl text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                    >
                        <SendIcon />
                    </button>
                </div>
            </form>
        </div>
    );
}

// =============== FAB Button ===============

export function AIAssistantFAB() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center transition-all hover:scale-110 z-40"
            >
                <SparklesIcon />
            </button>
            <AIChatWidget isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
