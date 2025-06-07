// services/openaiService.ts

import axios from "axios";
import path from "path";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function downloadFileAsBuffer(url: string): Promise<{ buffer: Buffer; filename: string }> {
  const resp = await axios.get<ArrayBuffer>(url, { responseType: "arraybuffer" });
  const ext = path.extname(new URL(url).pathname).toLowerCase() || ".txt";
  const filename = `resume${ext}`;
  return { buffer: Buffer.from(resp.data), filename };
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer);
  return data.text;
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function extractTextFromResumeUrl(resumeUrl: string): Promise<string> {
  const { buffer, filename } = await downloadFileAsBuffer(resumeUrl);
  const ext = path.extname(filename).toLowerCase();

  if (ext === ".pdf") {
    return extractTextFromPDF(buffer);
  }
  if (ext === ".docx") {
    return extractTextFromDOCX(buffer);
  }
  if (ext === ".txt") {
    return buffer.toString("utf-8");
  }
  // Fallback for other formats—attempt DOCX extraction, else empty
  try {
    return await extractTextFromDOCX(buffer);
  } catch {
    return "";
  }
}

export async function extractKeywordsFromText(text: string): Promise<string[]> {
  const prompt = `
You are an assistant that reads a resume and outputs up to five distinct job titles that best align with the candidate’s technical experience. Only include titles that reflect actual development roles implied by the resume (for example “Node.js Developer” or “React Developer”). Do not include generic skills (e.g., “JavaScript” or “CI/CD”), managerial titles, or personal names. Ignore duplicates and return exactly the titles as a comma-separated list on a single line, with no extra text.


Resume text:
${text}
  `.trim();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 60,
  });

  const raw = response.choices[0]?.message?.content?.trim() || "";
  return raw
    .split(",")
    .map((kw) => kw.trim())
    .filter((kw, idx, arr) => kw.length > 0 && arr.indexOf(kw) === idx)
    .slice(0, 5);
}

export async function extractKeywordsFromResumeUrl(resumeUrl: string): Promise<string[]> {
  const text = await extractTextFromResumeUrl(resumeUrl);
  return extractKeywordsFromText(text);
}

export async function detectMatchScore(
  resumeText: string,
  jobDescription: string
): Promise<number> {
  const prompt = `
  You are an AI assistant that evaluates how well a resume matches a job description. Your task is to analyze the provided resume text and job description, and return a match score from 0 to 100, where 0 means no match and 100 means perfect match.

  rules:
  - You MUST return only a number between 0 and 100.
  Resume text:  
  ${resumeText}
  Job description:
  ${jobDescription}
    `.trim();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 10,
  });
  const raw = response.choices[0]?.message?.content?.trim() || "0";
  const score = parseInt(raw, 10);
  return isNaN(score) ? 0 : Math.min(Math.max(score, 0), 100);
}
