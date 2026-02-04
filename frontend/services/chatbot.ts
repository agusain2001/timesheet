/**
 * Chatbot API Service
 */

import { apiPost } from "./api";
import type { ChatMessage, ChatResponse } from "@/types/api";

const BASE_URL = "/chatbot";

/**
 * Send a message to the AI chatbot
 */
export async function sendMessage(message: string): Promise<ChatResponse> {
    const payload: ChatMessage = { message };
    return apiPost<ChatResponse>(`${BASE_URL}/chat`, payload);
}

/**
 * Get chat history
 */
export async function getChatHistory(): Promise<ChatResponse[]> {
    return apiPost<ChatResponse[]>(`${BASE_URL}/history`, {});
}
