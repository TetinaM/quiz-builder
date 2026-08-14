import {
  CreateQuizPayload,
  QuizDetail,
  QuizSummary,
} from "@/types/quiz";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? `Request failed with status ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export function getQuizzes(): Promise<QuizSummary[]> {
  return request<QuizSummary[]>("/quizzes");
}

export function getQuiz(id: string): Promise<QuizDetail> {
  return request<QuizDetail>(`/quizzes/${id}`);
}

export function createQuiz(payload: CreateQuizPayload): Promise<QuizDetail> {
  return request<QuizDetail>("/quizzes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteQuiz(id: string): Promise<void> {
  return request<void>(`/quizzes/${id}`, { method: "DELETE" });
}
