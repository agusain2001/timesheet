/**
 * Chatbot API Service
 * Supports text chat, file uploads, document scanning, and save-to-activity
 */

import { getToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "";
const BASE_URL = `${API}/api/chatbot`;

function authHeaders(): Record<string, string> {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Send a text message to the AI chatbot
 */
export async function sendMessage(message: string) {
    const res = await fetch(`${BASE_URL}/chat`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
    return res.json();
}

/**
 * Send message with multiple file attachments
 */
export async function sendMessageWithFiles(message: string, files: File[]) {
    const formData = new FormData();
    formData.append("message", message);
    files.forEach((file) => formData.append("files", file));

    const res = await fetch(`${BASE_URL}/chat-with-files`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
    });
    if (!res.ok) throw new Error(`Chat with files failed: ${res.status}`);
    return res.json();
}

/**
 * Batch scan documents (PDFs and images) for OCR extraction
 */
export async function scanDocuments(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const res = await fetch(`${BASE_URL}/scan-documents`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
    });
    if (!res.ok) throw new Error(`Scan failed: ${res.status}`);
    return res.json();
}

/**
 * Save extracted data as Expense or Task
 */
export async function saveToActivity(data: {
    activity_type: "expense" | "task";
    title: string;
    description?: string;
    project_id?: string;
    vendor?: string;
    amount?: number;
    currency?: string;
    category?: string;
    date?: string;
}) {
    const res = await fetch(`${BASE_URL}/save-to-activity`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Save failed: ${res.status}`);
    return res.json();
}

/**
 * Get chat history for current user
 */
export async function getChatHistory(skip = 0, limit = 50) {
    const res = await fetch(`${BASE_URL}/history?skip=${skip}&limit=${limit}`, {
        method: "GET",
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`History failed: ${res.status}`);
    return res.json();
}

/**
 * Analyze a single file
 */
export async function analyzeFile(file: File, purpose = "expense") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", purpose);

    const res = await fetch(`${BASE_URL}/analyze-file`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
    });
    if (!res.ok) throw new Error(`Analysis failed: ${res.status}`);
    return res.json();
}
