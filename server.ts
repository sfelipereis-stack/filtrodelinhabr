import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// 1. Tabela de produtos idêntica ao seu constants para validação no lado seguro
const PRODUCTS_BACKEND = [
  { id: 1, name: "Filtro 3 Tomadas ABS", type: "abs", master: 20, masterPrices: { c1: 22.90, c3: 26.90, c5: 34.90 }, unitPrices: { c1: 24.90, c3: 28.90, c5: 36.90 } },
  { id: 2, name: "Filtro 4 Tomadas ABS", type: "abs", master: 20, masterPrices: { c1: 24.50, c3: 29.50, c5: 38.50 }, unitPrices: { c1: 26.50, c3: 31.50, c5: 40.50 } },
  { id: 3, name: "Filtro 5 Tomadas ABS", type: "abs", master: 20, masterPrices: { c1: 25.90, c3: 29.90, c5: 38.90 }, unitPrices: { c1: 27.90, c3: 31.90, c5: 40.90 } },
  { id: 4, name: "Filtro 6 Tomadas ABS", type: "abs", master: 16, masterPrices: { c1: 31.10, c3: 35.25, c5: 39.25 }, unitPrices: { c1: 33.10, c3: 37.25, c5: 41.25 } },
  { id: 5, name: "Filtro 6 Tomadas Metal", type: "metal", master: 12, masterPrices: { c1: 43.00, c3: 47.00, c5: 51.00 }, unitPrices: { c1: 45.00, c3: 49.00, r5: 53.00, c5: 53.00 } },
  { id: 6, name: "Filtro 8 Tomadas Metal", type: "metal", master: 10, masterPrices: { c1: 52.00, c3: 56.00, c5: 60.00 }, unitPrices: { c1: 54.00, c3: 58.00, c5: 62.00 } },
  { id: 7, name: "Filtro 10 Tomadas Metal", type: "metal", master: 8, masterPrices: { c1: 59.00, c3: 64.00, c5: 68.00 }, unitPrices: { c1: 61.00, c3: 66.00, c5: 70.00 } }
];

const REGIONS_BACKEND = {
  sudesteSul: ['SP', 'RJ', 'MG', 'ES', 'PR', 'SC', 'RS'],
  centroOeste: ['GO', 'MT', 'MS', 'DF'],
  nordeste: ['BA', 'PE', 'CE', 'MA', 'PI', 'RN', 'PB', 'AL', 'SE'],
  norte: ['AM', 'PA', 'TO', 'RO', 'RR', 'AP', 'AC']
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // InfinitePay Integration Proxy - VERSÃO BLINDADA CONTRA FRAUDES
  app.post("/api/checkout/infinitepay", async (req, res) => {
    try {
      const { items, customer, address, userMode, selectedState } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Carrinho inválido." });
      }

      let totalItemsCount = 0;
      let hasMetal = false;

      // 2. Recalcula e valida os produtos linha por linha usando a tabela do servidor
      const validatedItems = items.map((clientItem: any) => {
        // Ignora o item de frete enviado pelo cliente se ele vier no array para recalcularmos do zero
        if (clientItem.description === "Frete de entrega") return null;

        // O seu frontend envia a descrição contendo dados do id e cabo, ou podemos ler propriedades passadas
        // Para garantir precisão, o ideal é decodificar o ID do produto. 
        // Vamos buscar o produto real na nossa lista segura usando o ID enviado pelo cliente
        const targetProduct = PRODUCTS_BACKEND.find(p => p.id === Number(clientItem.id));
        
        if (!targetProduct) {
          throw new Error(`Produto inválido ou não cadastrado.`);
        }

        const cableKey = clientItem.cableKey as 'c1' | 'c3' | 'c5';
        if (targetProduct.type === 'metal') hasMetal = true;
        
        const qty = parseInt(clientItem.quantity, 10) || 1;
        totalItemsCount += qty;

        // Verifica se a regra de atacado/revendedor se aplica para o preço correto
        const isWholesale = userMode === 'revendedor' && qty >= targetProduct.master;
        const officialPrice = isWholesale 
          ? targetProduct.masterPrices[cableKey] 
          : targetProduct.unitPrices[cableKey];

        return {
          quantity: qty,
          price: Math.round(officialPrice * 100), // Converte para centavos de forma segura
          description: `${targetProduct.name} (${cableKey.replace('c1','1m').replace('c3','3m').replace('c5','5m')})`
        };
      }).filter(Boolean);

      // 3. Recalcula o Frete de forma protegida no servidor
      let secureFreight = 0;
      if (selectedState && totalItemsCount > 0) {
        let baseFreight = hasMetal 
          ? (totalItemsCount <= 2 ? 20 : totalItemsCount <= 4 ? 25 : 30) 
          : (totalItemsCount <= 2 ? 15 : totalItemsCount <= 4 ? 20 : 25);
          
        if (REGIONS_BACKEND.sudesteSul.includes(selectedState)) secureFreight = baseFreight;
        else if (REGIONS_BACKEND.centroOeste.includes(selectedState)) secureFreight = baseFreight + 5;
        else if (REGIONS_BACKEND.nordeste.includes(selectedState)) secureFreight = baseFreight + 8;
        else if (REGIONS_BACKEND.norte.includes(selectedState)) secureFreight = baseFreight + 12;
        else secureFreight = baseFreight;
      }

      // Adiciona o frete calculado com segurança ao payload
      if (secureFreight > 0) {
        validatedItems.push({
          quantity: 1,
          price: Math.round(secureFreight * 100),
          description: "Frete de entrega"
        });
      }

      // 4. Monta o payload definitivo e blindado para a InfinitePay
      const securePayload = {
        handle: "eletrizei-ltda",
        items: validatedItems,
        customer: customer || undefined,
        address: address || undefined,
        redirect_url: req.body.redirect_url || window.location.origin
      };

      console.log("Enviando Payload Blindado:", JSON.stringify(securePayload));

      const response = await fetch("https://api.checkout.infinitepay.io/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(securePayload),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error("InfinitePay API Response Error:", data);
        throw new Error(data.message || data.error || "Failed to create checkout link");
      }

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
