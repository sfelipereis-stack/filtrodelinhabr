import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // InfinitePay Integration Proxy
  app.post("/api/checkout/infinitepay", async (req, res) => {
    try {
      // 1. Pegamos os dados que o comprador preencheu no carrinho
      const { items, customer, address, order_nsu } = req.body;

   // Monta o payload conforme a documentação da InfinitePay
    const infinitePayPayload = {
      handle: "eletrizei-ltda", 
      items: items.map((item: any) => ({
        quantity: item.quantity,
        price: item.price, // <-- MUDADO AQUI (repassa o valor direto do carrinho)
        description: item.description || 'Produto Sem Descrição'
      })),
      order_nsu: order_nsu || `order-${Date.now()}`,
      customer: customer || undefined,
      address: address || undefined
  
      };

      console.log("Enviando para InfinitePay:", JSON.stringify(infinitePayPayload));

      const response = await fetch("https://api.checkout.infinitepay.io/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(infinitePayPayload),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error("InfinitePay API Response Error:", data);
        throw new Error(data.message || JSON.stringify(data) || "Failed to create checkout link");
      }

      // Devolve o link gerado para o frontend redirecionar o cliente
      res.json(data);
    } catch (error: any) {
      console.error("InfinitePay Proxy Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
