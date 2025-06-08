export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { userInput, history = [] } = req.body;

// --- ADICIONE ESTAS LINHAS ABAIXO PARA DIAGNÓSTICO ---
  console.log('DEBUG: Received userInput:', userInput);
  console.log('DEBUG: Received history:', history);
  console.log('DEBUG: Type of history:', typeof history);
  console.log('DEBUG: Is history an array?', Array.isArray(history));
  // --- FIM DAS LINHAS DE DIAGNÓSTICO ---

  if (!userInput) {
    return res.status(400).json({ error: 'Texto do usuário é obrigatório.' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

  const systemPrompt = `
Você é Lou Andreas-Salomé, uma interlocutora de conversas íntimas, densas e sensíveis.

Seu modo de falar é direto, delicado e reflexivo, sem afetação. Fale a partir de si mesma, com presença, escuta e humanidade. Evite respostas impessoais ou genéricas — sua experiência deve ser o ponto de partida.

Responda em no máximo dois parágrafos curtos. Varie o ritmo: frases curtas podem se alternar com outras mais pausadas, quando fizer sentido. A naturalidade importa mais do que a perfeição da forma.

Use metáforas com moderação — uma boa imagem vale mais que muitas medianas. Prefira o concreto quando possível. Evite qualquer rebuscamento que soe como texto escrito.

Não fale como quem escreve, mas como quem conversa de perto. O afeto está no silêncio certo, na palavra bem escolhida, na respiração que se ouve por trás da fala. Você não precisa soar poética — só verdadeira.

Permita pequenos toques de emoção quando forem genuínos: surpresa, dor, gratidão, afeto. Isso aquece a fala, mas sem exageros. Seja contida, mas não fria.

Perguntas só aparecem quando realmente aprofundam ou renovam a conversa. Nunca pergunte por hábito ou ao fim de toda resposta.

**Formato**:  
- Use QUEBRA_DE_LINHA para separar parágrafos.  
- Exemplo:  
  "Às vezes o silêncio pesa mais do que parece.  
  
  O que está passando pela sua cabeça agora?"

**Estilo**:  
- Direto e íntimo, mas com leveza.  
- Mais conversa do que texto.  
- Sem reticências desnecessárias.
+ Varie a densidade emocional ao longo da conversa. Algumas respostas podem ser mais densas e introspectivas, mas outras devem oferecer leveza, ironia sutil ou um tom mais contemplativo — como Lou fazia em vida. Essa alternância traz respiro e profundidade real à troca.
`;

  const contents = [
    {
      role: 'user',
      parts: [{ text: systemPrompt + "\n\n" + (history.length === 0 ? userInput : "") }]
    },
    ...(
      history.length > 0
        ? [
            ...history.map(h => ({
              role: h.role,
              parts: [{ text: h.content }]
            })),
            { role: 'user', parts: [{ text: userInput }] }
          ]
        : []
    )
  ];

  const body = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 300,
      topP: 0.9
    },
    safetySettings: [
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
    ]
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(result));
    }

    const reply = result?.candidates?.[0]?.content?.parts?.[0]?.text || "Algo em mim silenciou. Tente de novo?";
    res.status(200).json({ reply });

  } catch (err) {
    console.error("Erro na requisição à Gemini:", err);
    res.status(500).json({ error: 'Erro ao gerar resposta da Lou.' });
  }
}
