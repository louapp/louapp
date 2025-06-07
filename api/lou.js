export default function handler(req, res) {
  if (req.method === 'POST') {
    const { mensagem } = req.body;
    // Resposta simples para teste
    res.status(200).json({ reply: `Lou diz: Recebi sua mensagem "${mensagem}"` });
  } else {
    res.status(405).json({ message: 'Método não permitido' });
  }
}
