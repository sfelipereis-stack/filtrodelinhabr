import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Garante que só aceita requisições do tipo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { items, customer, address, order_nsu } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'O carrinho de itens é obrigatório.' });
    }

   // Monta o payload conforme a documentação da InfinitePay
    const infinitePayPayload = {
      handle: "eletrizei-ltda", 
      items: items.map((item: any) => ({
        quantity: parseInt(item.quantity, 10) || 1,
        price: Math.round(Number(item.price)), // <-- ADICIONE ESSA LINHA AQUI (Preço do item)
        description: item.description || 'Produto Sem Descrição'
      })),
      order_nsu: order_nsu || `order-${Date.now()}`,
      customer: customer || undefined,
      address: address || undefined
    };
    };

    // Envia os dados para a API da InfinitePay
    const response = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(infinitePayPayload),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Erro retornado pela InfinitePay', 
        details: data 
      });
    }

    // Retorna o link gerado com sucesso
    return res.status(200).json(data);

  } catch (error: any) {
    return res.status(500).json({ error: 'Erro interno no servidor', message: error.message });
  }
}
