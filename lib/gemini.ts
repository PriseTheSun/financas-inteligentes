import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export const getGeminiResponse = async (prompt: string, financialData: any) => {
  if (!apiKey) {
    throw new Error("Gemini API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `Você é um consultor financeiro pessoal de elite. 
  Sua tarefa é analisar os dados financeiros do usuário e fornecer conselhos práticos, priorizar pagamentos, sugerir planos de investimento e criar lembretes úteis.
  Seja empático, mas direto e profissional. Use Markdown para formatar sua resposta.
  Os dados do usuário estão em formato JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        parts: [
          { text: systemInstruction },
          { text: `Dados Financeiros: ${JSON.stringify(financialData)}` },
          { text: `Pergunta do Usuário: ${prompt}` }
        ]
      }
    ],
  });

  return response.text;
};
