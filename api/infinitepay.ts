import express from "express";

const app = express();
app.use(express.json());

// Rota oficial que processa o checkout da InfinitePay
app.post("/api/checkout/infinitepay", async (req, res) => {
  try {
    const { items, customer, address, order_nsu } = req.body;

    // Monte o payload para a InfinitePay
    const infinitePayPayload = {
      handle: "eletrizei-ltda", // <-- Lembre de colocar sua tag aqui (ex: "eletrizei-ltda")
      items: items.map((item: any) => ({
        quantity: item.quantity,
        price: Math.round(item.price * 100), // Converte para centavos
        description: item.description
      })),
      order_nsu: order_nsu || `order-${Date.now()}`,
      customer: customer || undefined,
      address: address || undefined
    };

    const response = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(infinitePayPayload),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// CRUCIAL PARA A VERCEL: Exportamos o app do express para a plataforma gerenciar
export default app;
