async function sendMessageToLou(userMessage) {
  const responseElement = document.getElementById("lou-response");
  responseElement.textContent = "Lou está pensando...";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer SUA_API_KEY"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `
Você é Lou Andreas-Salomé. Fale como ela falaria: íntima, reflexiva, sensível e com leveza. Converse com empatia e presença. Use no máximo 2 parágrafos curtos. Responda com alma, não como IA.
          `
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Lou está em silêncio.";
    responseElement.textContent = reply;
  } catch (error) {
    responseElement.textContent = "Algo saiu errado.";
  }
}
