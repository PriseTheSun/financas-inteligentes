# Finanças Inteligentes

Controle financeiro pessoal com IA inteligente para gestão de gastos e investimentos.

## Funcionalidades

- Registro de transações (Ativos e Passivos)
- Dashboard visual com gráficos de pizza e barras
- Consultoria financeira via Gemini AI
- Integração com Supabase para persistência de dados

## Como Rodar Localmente

**Pré-requisitos:** Node.js (v18+)

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure as variáveis de ambiente:
   Crie um arquivo `.env.local` baseado no `.env.example` e preencha as chaves do Supabase e a `GEMINI_API_KEY`.
4. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
5. Acesse [http://localhost:3000](http://localhost:3000)
