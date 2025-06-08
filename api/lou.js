export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Renomeado history para rawHistory para o valor original recebido do corpo da requisição
  const { userInput, history: rawHistory = [] } = req.body; 

  // --- INÍCIO DA CORREÇÃO: TRATAMENTO ROBUSTO DO HISTÓRICO ---
  let history = []; // Inicializa history como um array vazio por padrão

  // Verifica se rawHistory é uma string (comum se o FlutterFlow enviar JSON como string)
  if (typeof rawHistory === 'string') {
    try {
      // Tenta fazer o parse da string para um objeto/array JSON
      const parsedHistory = JSON.parse(rawHistory);
      // Verifica se o resultado do parse é realmente um array
      if (Array.isArray(parsedHistory)) {
        history = parsedHistory; // Se for um array, usa-o
      } else {
        // Se não for um array após o parse (ex: era um objeto JSON simples), loga um aviso
        console.warn('DEBUG: Parsed history from string is not an array, defaulting to empty array.');
        history = []; 
      }
    } catch (e) {
      // Se houver um erro no parse (string inválida ou não-JSON), loga e usa array vazio
      console.error('DEBUG: Failed to parse history string:', rawHistory, 'Error:', e);
      history = []; 
    }
  } else if (Array.isArray(rawHistory)) {
    // Se rawHistory já for um array, usa-o diretamente
    history = rawHistory;
  } else {
    // Para qualquer outro tipo (null, undefined, number, etc.), loga um aviso e usa array vazio
    console.warn('DEBUG: history is neither string nor array, defaulting to empty array. Type:', typeof rawHistory, 'Value:', rawHistory);
    history = []; 
  }
  // --- FIM DA CORREÇÃO ---


  // --- Novos Logs de Depuração para a variável 'history' JÁ TRATADA ---
  console.log('DEBUG: Final processed history:', history);
  console.log('DEBUG: Type of final processed history:', typeof history);
  console.log('DEBUG: Is final processed history an array?', Array.isArray(history));
  // --- FIM DOS NOVOS LOGS DE DEPURAÇÃO ---


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
      // Se history for vazio, envia apenas o userInput como parte do systemPrompt inicial
      // Caso contrário, o userInput será adicionado no final após o history mapeado
      parts: [{ text: systemPrompt + "\n\n" + (history.length === 0 ? userInput : "") }]
    },
    ...(
      history.length > 0
        ? [
            // Mapeia o histórico existente para o formato 'parts' esperado pela API Gemini
            ...history.map(h => ({
              role: h.role,
              parts: [{ text: h.content }] // Sua API espera 'content' e não 'parts' aninhado aqui
            })),
            // Adiciona a mensagem do usuário atual ao final do histórico para a IA
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
      // Log detalhado do erro da API Gemini, se houver, para depuração
      console.error("Erro da API Gemini:", JSON.stringify(result, null, 2));
      throw new Error(JSON.stringify(result));
    }

    // Extrai a resposta da Lou ou uma mensagem padrão em caso de falha
    const reply = result?.candidates?.[0]?.content?.parts?.[0]?.text || "Algo em mim silenciou. Tente de novo?";
    res.status(200).json({ reply }); // Envia a resposta de volta ao FlutterFlow

  } catch (err) {
    // Captura e loga erros que ocorrem durante a chamada ou processamento da API Gemini
    console.error("Erro na requisição à Gemini:", err.message || err); 
    res.status(500).json({ error: 'Erro ao gerar resposta da Lou.' }); // Envia erro genérico para o cliente
  }
}
