export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Desestrutura o corpo da requisição, renomeando para rawUserInput e rawHistory
  // para manter os valores originais recebidos e evitar conflitos.
  const { userInput: rawUserInput, history: rawHistory = [] } = req.body; 

  // --- INÍCIO DA CORREÇÃO: TRATAMENTO DO userInput ---
  // A variável userInput será o valor final processado.
  let userInput = rawUserInput;
  // Verifica se o rawUserInput é uma string e se ela parece um placeholder do FlutterFlow.
  if (typeof rawUserInput === 'string' && rawUserInput.startsWith('{{') && rawUserInput.endsWith('}}')) {
    // Se for um placeholder, substitui por uma mensagem padrão para o ambiente de teste.
    userInput = "Olá Lou, qual sua visão sobre a vida?"; // Mensagem de teste padrão.
    console.warn('DEBUG: userInput received as FlutterFlow literal. Using default test input.');
  }
  // --- FIM DA CORREÇÃO DO userInput ---


  // --- INÍCIO DA CORREÇÃO: TRATAMENTO ROBUSTO DO HISTÓRICO ---
  // A variável history será o array final processado para enviar ao Gemini.
  let history = []; 
  // Verifica se rawHistory é uma string (cenário comum do FlutterFlow enviando JSON como string).
  if (typeof rawHistory === 'string') {
    try {
      // Tenta fazer o parse da string para um objeto/array JSON.
      const parsedHistory = JSON.parse(rawHistory);
      // Confirma se o resultado do parse é um array.
      if (Array.isArray(parsedHistory)) {
        history = parsedHistory; // Se for um array, usa-o.
      } else {
        // Loga um aviso se o parse foi bem-sucedido mas o resultado não é um array.
        console.warn('DEBUG: Parsed history from string is not an array, defaulting to empty array.');
        history = []; 
      }
    } catch (e) {
      // Loga erros durante o parse (ex: string não é um JSON válido) e define history como array vazio.
      console.error('DEBUG: Failed to parse history string:', rawHistory, 'Error:', e);
      history = []; 
    }
  } else if (Array.isArray(rawHistory)) {
    // Se rawHistory já for um array, usa-o diretamente.
    history = rawHistory;
  } else {
    // Para outros tipos (null, undefined, etc.), loga um aviso e define history como array vazio.
    console.warn('DEBUG: history is neither string nor array, defaulting to empty array. Type:', typeof rawHistory, 'Value:', rawHistory);
    history = []; 
  }
  // --- FIM DA CORREÇÃO DO HISTÓRICO ---

  // --- Novos Logs de Depuração para as variáveis TRATADAS ---
  console.log('DEBUG: Final processed userInput:', userInput);
  console.log('DEBUG: Final processed history:', history);
  console.log('DEBUG: Is final processed history an array?', Array.isArray(history));
  // --- FIM DOS NOVOS LOGS DE DEPURAÇÃO ---

  // Validação básica para userInput após o processamento.
  if (!userInput || typeof userInput !== 'string' || userInput.trim() === '') {
    return res.status(400).json({ error: 'Texto do usuário é obrigatório e deve ser uma string não vazia.' });
  }

  // Pega a chave da API Gemini das variáveis de ambiente do Vercel.
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  // Endpoint da API Gemini Pro.
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

  // Prepara o array 'contents' no formato exigido pela API Gemini.
  const contents = [
    {
      role: 'user',
      // Se o histórico estiver vazio, a mensagem do usuário é concatenada ao systemPrompt inicial.
      // Caso contrário, o userInput será adicionado como uma mensagem de usuário separada no final.
      parts: [{ text: systemPrompt + "\n\n" + (history.length === 0 ? userInput : "") }]
    },
    ...(
      history.length > 0
        ? [
            // Mapeia o histórico existente para o formato 'role' e 'parts' com 'text' esperado pela API Gemini.
            ...history.map(h => ({
              role: h.role,
              parts: [{ text: h.content }] 
            })),
            // Adiciona a mensagem do usuário atual como a última parte da conversa.
            { role: 'user', parts: [{ text: userInput }] }
          ]
        : []
    )
  ];

  // --- LOG DO CONTEÚDO ENVIADO PARA GEMINI ---
  // Utilitário para formatar o objeto contents de forma legível nos logs.
  console.log('DEBUG: Contents being sent to Gemini:', JSON.stringify(contents, null, 2));
  // --- FIM DO LOG ---

  // Prepara o corpo da requisição para a API Gemini.
  const body = {
    contents,
    generationConfig: {
      temperature: 0.7,      // Controla a aleatoriedade da resposta (0.0 a 1.0).
      maxOutputTokens: 300,  // Limite de tokens na resposta da IA.
      topP: 0.9              // Controla a diversidade da resposta.
    },
    safetySettings: [
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" } // Configurações de segurança.
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

    //console.log('DEBUG: Full Gemini API Response:', JSON.stringify(result, null, 2)); // ESTA LINHA DEVE SER REMOVIDA/COMENTADA NOVAMENTE

    if (!response.ok) {
      console.error("Erro da API Gemini (resposta não-ok):", JSON.stringify(result, null, 2));
      throw new Error(`Gemini API Error: ${response.status} - ${result.error?.message || JSON.stringify(result)}`);
    }

    const reply = result?.candidates?.[0]?.content?.parts?.[0]?.text || "Algo em mim silenciou. Tente de novo?";
    res.status(200).json({ reply });

  } catch (err) {
    console.error("Erro na requisição à Gemini (catch):", err.message || err);
    res.status(500).json({ error: 'Erro ao gerar resposta da Lou.' });
  }
}
