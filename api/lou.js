// api/lou.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { mensagem } = req.body;
  if (!mensagem) {
    return res.status(400).json({ error: 'Mensagem é obrigatória' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave da API não configurada' });
    }

    // Exemplo de chamada para a Gemini API
    const resposta = await fetch('https://api.gemini.example.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gemini-1-turbo",
        messages: [{ role: "user", content: mensagem }],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await resposta.json();

    if (!resposta.ok) {
      return res.status(resposta.status).json({ error: data.error || 'Erro na API Gemini' });
    }

    const reply = data.choices?.[0]?.message?.content || 'Resposta vazia da Gemini';

    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
}
