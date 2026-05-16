/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, 
  ChevronDown, 
  Share2, 
  Youtube, 
  MapPin, 
  Copy, 
  CheckCircle2, 
  Smartphone,
  Zap,
  Printer,
  Search,
  AlertCircle
} from 'lucide-react';
import QRCode from "react-qr-code";
import { UserMode, Product, CableKey, CartItem } from './types';
import { PRODUCTS, REGIONS, PIX_CONFIG } from './constants';
import { generatePixPayload } from './lib/pix-utils';
import { validateCPF, validateCNPJ, isCNPJ, isCPF } from './lib/validation';

export default function App() {
  const [userMode, setUserMode] = useState<UserMode>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selectedState, setSelectedState] = useState('');
  
  // Customer Info State
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCep, setCustomerCep] = useState('');
  const [customerStreet, setCustomerStreet] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [customerComplement, setCustomerComplement] = useState('');
  const [customerNeighborhood, setCustomerNeighborhood] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerReference, setCustomerReference] = useState('');
  const [customerCpfCnpj, setCustomerCpfCnpj] = useState('');
  const [customerIsIeExempt, setCustomerIsIeExempt] = useState(false);
  const [customerStateRegistration, setCustomerStateRegistration] = useState('');
  const [customerWhatsappDDD, setCustomerWhatsappDDD] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [customerPhone2DDD, setCustomerPhone2DDD] = useState('');
  const [customerPhone2, setCustomerPhone2] = useState('');
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // Persistence (optional but good)
  useEffect(() => {
    const savedMode = localStorage.getItem('userMode');
    if (savedMode) setUserMode(savedMode as UserMode);
  }, []);

  const totalItems = useMemo(() => 
    Object.values(cart).reduce((acc: number, qty: number) => acc + qty, 0)
  , [cart]);

  const cartDetails = useMemo(() => {
    let subtotal = 0;
    let hasMetal = false;
    const items: Array<{ product: Product; cable: CableKey; qty: number; price: number }> = [];

    (Object.entries(cart) as [string, number][]).forEach(([key, qty]) => {
      if (qty <= 0) return;
      const [id, cable] = key.split('-');
      const product = PRODUCTS.find(p => p.id === parseInt(id));
      if (!product) return;
      
      if (product.type === 'metal') hasMetal = true;
      
      const isWholesale = userMode === 'revendedor' && qty >= product.master;
      const price = isWholesale ? product.masterPrices[cable as CableKey] : product.unitPrices[cable as CableKey];
      
      subtotal += price * qty;
      items.push({ product, cable: cable as CableKey, qty, price });
    });

    return { items, subtotal, hasMetal };
  }, [cart, userMode]);

  const freightValue = useMemo(() => {
    const total = totalItems as number;
    if (!selectedState || total === 0) return 0;
    
    let base = cartDetails.hasMetal 
      ? (total <= 2 ? 20 : total <= 4 ? 25 : 30) 
      : (total <= 2 ? 15 : total <= 4 ? 20 : 25);
      
    if (REGIONS.sudesteSul.includes(selectedState)) return base;
    if (REGIONS.centroOeste.includes(selectedState)) return base + 5;
    if (REGIONS.nordeste.includes(selectedState)) return base + 8;
    if (REGIONS.norte.includes(selectedState)) return base + 12;
    return base;
  }, [selectedState, totalItems, cartDetails.hasMetal]);

  const finalTotal = cartDetails.subtotal + freightValue;

  const updateQty = (productId: number, cable: CableKey, delta: number) => {
    const key = `${productId}-${cable}`;
    setCart(prev => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) + delta)
    }));
  };

  const handleCepLookup = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    
    setIsCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        alert("CEP não encontrado.");
      } else {
        setCustomerStreet(data.logradouro || '');
        setCustomerNeighborhood(data.bairro || '');
        setCustomerCity(data.localidade || '');
        setSelectedState(data.uf || '');
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setIsCepLoading(false);
    }
  };

  const validateForm = () => {
    const requiredFields = {
      "Nome": customerName,
      "Email": customerEmail,
      "CEP": customerCep,
      "Rua": customerStreet,
      "Número": customerNumber,
      "Cidade": customerCity,
      "Estado": selectedState,
      "CPF/CNPJ": customerCpfCnpj,
      "WhatsApp": customerWhatsapp,
      "DDD": customerWhatsappDDD
    };

    const emptyFields = Object.entries(requiredFields)
      .filter(([_, val]) => !val)
      .map(([name]) => name);

    if (emptyFields.length > 0) {
      alert(`Por favor, preencha os campos obrigatórios: ${emptyFields.join(', ')}`);
      return false;
    }

    if (!customerEmail.includes('@')) {
      alert("Por favor, informe um e-mail válido.");
      return false;
    }

    if (isCPF(customerCpfCnpj)) {
      if (!validateCPF(customerCpfCnpj)) {
        alert("CPF Inválido.");
        return false;
      }
    } else if (isCNPJ(customerCpfCnpj)) {
      if (!validateCNPJ(customerCpfCnpj)) {
        alert("CNPJ Inválido.");
        return false;
      }
      if (!customerIsIeExempt && !customerStateRegistration) {
        alert("Por favor, informe a Inscrição Estadual ou marque como Isento.");
        return false;
      }
    } else {
      alert("Informe um CPF ou CNPJ válido.");
      return false;
    }

    return true;
  };

  const handleProcessOrder = (isPix = false) => {
    if (!validateForm()) return;
    
    let msg = `*SOLICITAÇÃO DE PEDIDO (${userMode?.toUpperCase()})*\n`;
    msg += `👤 *Cliente:* ${customerName}\n`;
    msg += `📄 *CPF/CNPJ:* ${customerCpfCnpj}\n`;
    if (isCNPJ(customerCpfCnpj)) {
      msg += `📄 *IE:* ${customerIsIeExempt ? 'Isento / Não possui' : customerStateRegistration}\n`;
    }
    msg += `📍 *CEP:* ${customerCep}\n`;
    msg += `📍 *Endereço:* ${customerStreet}, ${customerNumber}\n`;
    if (customerComplement) msg += `📍 *Compl:* ${customerComplement}\n`;
    msg += `📍 *Bairro:* ${customerNeighborhood}\n`;
    msg += `📍 *Cidade/UF:* ${customerCity} - ${selectedState}\n`;
    if (customerReference) msg += `📍 *Ref:* ${customerReference}\n`;
    msg += `📱 *WhatsApp:* (${customerWhatsappDDD}) ${customerWhatsapp}\n`;
    if (customerPhone2) msg += `📞 *Tel 2:* (${customerPhone2DDD}) ${customerPhone2}\n`;
    msg += `\n`;
    
    if (isPix) msg += `✅ PAGAMENTO VIA PIX REALIZADO\n`;
    
    cartDetails.items.forEach(item => {
      msg += `📦 ${item.product.name} | ${item.qty}x | R$ ${(item.price * item.qty).toFixed(2)}\n`;
    });
    
    msg += `\n💰 *TOTAL:* R$ ${finalTotal.toFixed(2)}`;
    if (isPix) msg += `\n\nEnvie o comprovante em anexo.`;
    
    window.open(`https://wa.me/5511954941312?text=${encodeURIComponent(msg)}`);
  };

  const handleInfinitePayCheckout = async () => {
    if (!validateForm()) return;

    setIsCheckoutLoading(true);
    try {
      const payload: any = {
        handle: "eletrizei-ltda",
        // CORRIGIDO: Agora repassa o valor decimal direto, pois o server.ts multiplicará por 100 de forma fixa
        items: cartDetails.items.map(item => ({
          quantity: item.qty,
          price: item.price, 
          description: `${item.product.name} (${item.cable.replace('c1','1m')})`
        })),
        customer: {
          name: customerName,
          email: customerEmail,
          phone_number: `+55${customerWhatsappDDD}${customerWhatsapp}`
        },
        address: {
          cep: customerCep,
          street: customerStreet,
          neighborhood: customerNeighborhood,
          number: customerNumber,
          complement: customerComplement
        },
        redirect_url: window.location.origin
      };

      if (freightValue > 0) {
        payload.items.push({
          quantity: 1,
          price: freightValue, // CORRIGIDO: Repassa o frete em decimal puro
          description: "Frete de entrega"
        });
      }

      const response = await fetch("/api/checkout/infinitepay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Não foi possível gerar o link de pagamento.");
      }
    } catch (error: any) {
      console.error("Checkout Error:", error);
      alert("Erro ao processar checkout: " + error.message);
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const pixPayload = useMemo(() => generatePixPayload(finalTotal), [finalTotal]);

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!userMode) {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="bg-white p-2 rounded-2xl w-24 h-24 mx-auto mb-6 shadow-2xl flex items-center justify-center border-2 border-blue-500 overflow-hidden">
            <img src="https://static.wixstatic.com/media/745c36_6acbb34df892415197825b2067757962~mv2.png" alt="Logo" className="max-h-full" />
          </div>
          <h1 className="text-white text-3xl font-black uppercase italic mb-2 tracking-tighter">ELETRIZEI LTDA</h1>
          <p className="text-slate-400 text-sm mb-8 font-medium">Selecione o seu perfil de acesso:</p>
          
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => { setUserMode('consumidor'); localStorage.setItem('userMode', 'consumidor'); }}
              className="bg-white hover:bg-slate-100 text-slate-900 p-6 rounded-2xl transition shadow-xl flex flex-col items-center gap-2 group cursor-pointer"
            >
              <span className="font-black text-xl uppercase tracking-tighter">Consumidor Final</span>
              <span className="text-xs text-slate-500 font-medium tracking-tight">Vitrine exclusiva e pagamento direto via PIX</span>
            </button>
            
            <button 
              onClick={() => { setUserMode('revendedor'); localStorage.setItem('userMode', 'revendedor'); }}
              className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-2xl transition shadow-xl flex flex-col items-center gap-2 group border-b-4 border-blue-800 cursor-pointer"
            >
              <span className="font-black text-xl uppercase tracking-tighter italic">Revendedor / Lojista</span>
              <span className="text-blue-100 text-xs font-medium tracking-tight">Tabela de Atacado para compras em lote</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`pb-24 md:pb-12 ${userMode === 'consumidor' ? 'mode-consumidor' : 'mode-revendedor'}`}>
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-lg md:mt-6 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
            <div 
              className="bg-white p-2 rounded-xl shadow-inner w-20 h-20 flex items-center justify-center overflow-hidden border-2 border-white cursor-pointer" 
              onClick={() => { setUserMode(null); localStorage.removeItem('userMode'); }}
            >
              <img src="https://static.wixstatic.com/media/745c36_6acbb34df892415197825b2067757962~mv2.png" alt="Logo" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-2xl font-black tracking-tight uppercase italic mb-0 text-white leading-none">ELETRIZEI LTDA</h1>
              <p className="text-blue-400 font-medium tracking-[0.2em] text-[10px] uppercase mt-1">Catálogo Digital • 2026</p>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3 no-print">
            <button 
              onClick={() => window.print()} 
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-lg cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              EXPORTAR PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 -mt-4">
        {/* Banner Condições */}
        <div className="bg-blue-600 text-white rounded-xl p-3 shadow-xl flex flex-col md:flex-row items-center justify-center gap-4 mb-8 text-center border-b-4 border-blue-800">
          <div className="flex items-center gap-2 text-white">
            <CheckCircle2 className="w-4 h-4" />
            <p className="text-[10px] font-black uppercase tracking-wide">Acesso: {userMode === 'revendedor' ? 'REVENDEDOR (ATACADO)' : 'CONSUMIDOR (VAREJO)'}</p>
          </div>
          <div className="flex items-center gap-2 text-yellow-200">
            <Zap className="w-4 h-4" />
            <p className="text-[10px] font-black uppercase tracking-widest italic">Equipamento Bivolt (110v/220v)</p>
          </div>
        </div>

        {/* Vídeo (Consumidor) */}
        {userMode === 'consumidor' && (
          <section className="mb-10 flex flex-col items-center">
            <h3 className="font-black text-slate-900 uppercase text-[10px] mb-4 tracking-widest flex items-center gap-2">
              <Youtube className="w-4 h-4 text-red-600" />
              VEJA O PRODUTO EM FUNCIONAMENTO
            </h3>
            <div className="w-full max-w-[320px] aspect-[9/16] bg-slate-900 rounded-[2.8rem] p-3 shadow-2xl border-[6px] border-slate-800 relative overflow-hidden flex items-center justify-center">
              <iframe 
                className="w-full h-full rounded-[2.2rem]" 
                src="https://www.youtube.com/embed/KcZIRztMO8E?autoplay=0&rel=0&modestbranding=1" 
                frameBorder="0" 
                allowFullScreen
              ></iframe>
            </div>
          </section>
        )}

        {/* Produtos */}
        <section className="mb-10">
          <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
              <span className="w-6 h-1 bg-blue-600 rounded-full"></span>
              Produtos Disponíveis
            </h2>
          </div>
          
          {/* Mobile View / Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden no-print">
            {PRODUCTS.map(p => (
              <ProductCard key={p.id} product={p} cart={cart} updateQty={updateQty} />
            ))}
          </div>

          {/* Desktop View - Table for Revendedor, Cards for Consumidor */}
          <div className="hidden md:block">
            {userMode === 'revendedor' ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                <table className="w-full text-left text-[11px] table-fixed border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold uppercase tracking-widest">
                      <th className="p-4 w-[80px]"></th>
                      <th className="p-4 border-r border-slate-800">Modelo</th>
                      <th className="p-4 text-center border-r border-slate-800 text-sm">Cabo 1m</th>
                      <th className="p-4 text-center border-r border-slate-800 text-sm">Cabo 3,0m</th>
                      <th className="p-4 text-center border-r border-slate-800 text-sm">Cabo 5,0m</th>
                      <th className="p-4 text-center bg-blue-700">Mín. Atacado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PRODUCTS.map((p, idx) => (
                      <tr key={p.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b`}>
                        <td className="p-2 text-center">
                          <img src={`https://via.placeholder.com/100?text=${encodeURIComponent(p.name)}`} className="w-10 h-10 object-contain mx-auto" />
                        </td>
                        <td className={`p-4 font-black uppercase text-[10px] ${p.type === 'metal' ? 'text-orange-700' : 'text-slate-900'}`}>{p.name}</td>
                        {(['c1', 'c3', 'c5'] as CableKey[]).map(c => (
                          <td key={c} className="p-2 text-center border-r">
                            <span className="block text-blue-700 font-black text-sm">R$ {p.masterPrices[c].toFixed(2)}</span>
                            <span className="block text-slate-400 text-[9px] italic">R$ {p.unitPrices[c].toFixed(2)}</span>
                            <div className="flex items-center justify-center mt-2 no-print gap-2">
                              <button onClick={() => updateQty(p.id, c, -1)} className="w-8 h-8 bg-slate-100 rounded-lg text-slate-400 hover:bg-slate-200 text-xl font-bold transition flex items-center justify-center">-</button>
                              <span className="w-10 text-center text-base font-black">{cart[`${p.id}-${c}`] || 0}</span>
                              <button onClick={() => updateQty(p.id, c, 1)} className="w-8 h-8 bg-slate-100 rounded-lg text-blue-600 hover:bg-slate-200 text-xl font-bold transition flex items-center justify-center">+</button>
                            </div>
                          </td>
                        ))}
                        <td className="p-4 text-center font-black bg-blue-50 text-blue-900">{p.master} un</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {PRODUCTS.map(p => (
                  <ProductDesktopCard key={p.id} product={p} cart={cart} updateQty={updateQty} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Footer info */}
        <footer className="mt-8 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col lg:flex-row justify-between items-center gap-8 shadow-sm">
            <div className="flex-1 text-[10px] text-slate-600 font-medium">
                <h4 className="font-black text-slate-900 uppercase mb-3 text-xs tracking-widest opacity-40">Informações Gerais</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-1.5 font-bold">
                    <p>• Fusível reserva incluso em todos os modelos.</p>
                    <p className="text-blue-700 uppercase font-black">→ Desconto aplicado automático no Atacado.</p>
                    <p>• Cabos 0,75mm² certificados Inmetro.</p>
                    <p className="font-bold text-slate-900 uppercase tracking-tighter">→ Pagamento Direto via PIX.</p>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <a href="https://instagram.com/filtrodelinhabr" target="_blank" className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-4 rounded-xl shadow-lg border-b-4 border-slate-600 text-center flex-1 min-w-[180px] transition group no-print">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest group-hover:text-blue-400 transition">Instagram</p>
                    <span className="text-lg font-black block tracking-tighter italic text-blue-400">@filtrodelinhabr</span>
                </a>
                <div className="bg-slate-900 text-white px-6 py-4 rounded-xl shadow-lg border-b-4 border-blue-600 text-center min-w-[180px]">
                    <p className="text-[8px] font-black text-blue-400 uppercase mb-1 tracking-widest">WhatsApp</p>
                    <span className="text-lg font-black block tracking-tighter italic">11 95494-1312</span>
                </div>
            </div>
        </footer>
      </main>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed bottom-0 left-0 right-0 z-50 no-print"
          >
            <div className="bg-white border-t border-slate-200 shadow-2xl p-4 md:max-w-lg md:mx-auto md:mb-4 md:rounded-2xl md:border overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between mb-3 border-b pb-2">
                  <h3 className="font-black text-slate-900 uppercase text-xs flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-blue-600" />
                      Seu Pedido
                  </h3>
                  <button onClick={() => setIsCartOpen(false)} className="cursor-pointer">
                    <ChevronDown className="w-6 h-6 text-slate-400" />
                  </button>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-3">
                {/* Nome e CPF/CNPJ */}
                <div className="grid grid-cols-1 sm:grid-cols-1 gap-2">
                  <div className="flex flex-col">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 pl-1">Nome / Razão Social *</label>
                    <input 
                      type="text" 
                      placeholder="Ex: João da Silva" 
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 rounded text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 pl-1">Email *</label>
                    <input 
                      type="email" 
                      placeholder="seu@email.com" 
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 rounded text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 pl-1">CPF ou CNPJ *</label>
                    <input 
                      type="text" 
                      placeholder="Apenas números" 
                      value={customerCpfCnpj}
                      onChange={(e) => setCustomerCpfCnpj(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white border border-slate-200 p-2 rounded text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                {/* IE (Condicional) */}
                {isCNPJ(customerCpfCnpj) && (
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 pl-1 block">Inscrição Estadual (IE)</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="text" 
                        placeholder="Número da IE" 
                        disabled={customerIsIeExempt}
                        value={customerStateRegistration}
                        onChange={(e) => setCustomerStateRegistration(e.target.value)}
                        className={`flex-1 bg-white border border-slate-200 p-2 rounded text-xs font-bold text-slate-900 ${customerIsIeExempt ? 'opacity-50' : ''}`}
                      />
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={customerIsIeExempt}
                          onChange={(e) => setCustomerIsIeExempt(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Não possui</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Endereço */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex flex-col">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 pl-1">CEP *</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="00000-000" 
                        value={customerCep}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setCustomerCep(val);
                          if (val.length === 8) handleCepLookup(val);
                        }}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-xs font-bold text-slate-900 pr-8"
                      />
                      {isCepLoading && (
                        <div className="absolute right-2 top-2">
                          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="sm:col-span-2 flex flex-col">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 pl-1">Rua *</label>
                    <input 
                      type="text" 
                      placeholder="Logradouro" 
                      value={customerStreet}
                      onChange={(e) => setCustomerStreet(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 rounded text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                   <div className="flex flex-col">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 pl-1">Número *</label>
                    <input 
                      type="text" 
                      value={customerNumber}
                      onChange={(e) => setCustomerNumber(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 rounded text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 pl-1">Complemento</label>
                    <input 
                      type="text" 
                      value={customerComplement}
                      onChange={(e) => setCustomerComplement(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 rounded text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 pl-1">Cidade *</label>
                    <input 
                      type="text" 
                      value={customerCity}
                      disabled
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs font-bold text-slate-900 opacity-70"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 pl-1">Estado *</label>
                    <select 
                      value={selectedState}
                      onChange={(e) => setSelectedState(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs font-bold text-slate-900 h-[34px] opacity-70"
                      disabled
                    >
                      <option value="">UF</option>
                      <optgroup label="SUL / SUDESTE">
                          <option value="SP">São Paulo</option>
                          <option value="RJ">Rio de Janeiro</option>
                          <option value="MG">Minas Gerais</option>
                          <option value="ES">Espírito Santo</option>
                          <option value="PR">Paraná</option>
                          <option value="SC">Santa Catarina</option>
                          <option value="RS">Rio Grande do Sul</option>
                      </optgroup>
                      <optgroup label="REGIONAL">
                          <option value="GO">Centro-Oeste (+R$5)</option>
                          <option value="BA">Nordeste (+R$8)</option>
                          <option value="AM">Norte (+R$12)</option>
                      </optgroup>
                    </select>
                  </div>
                </div>

                <input 
                  type="text" 
                  placeholder="Referência para Entrega (Opcional)" 
                  value={customerReference}
                  onChange={(e) => setCustomerReference(e.target.value)}
                  className="w-full bg-white border border-slate-200 p-2 rounded text-xs font-bold text-slate-900"
                />

                {/* Contato */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 pl-1">WhatsApp *</label>
                    <div className="flex gap-1">
                      <input 
                        type="tel" 
                        placeholder="DDD" 
                        maxLength={2}
                        value={customerWhatsappDDD}
                        onChange={(e) => setCustomerWhatsappDDD(e.target.value.replace(/\D/g, ''))}
                        className="w-12 bg-white border border-slate-200 p-2 rounded text-xs font-bold text-slate-900 text-center"
                      />
                      <input 
                        type="tel" 
                        placeholder="Apenas números" 
                        value={customerWhatsapp}
                        onChange={(e) => setCustomerWhatsapp(e.target.value.replace(/\D/g, ''))}
                        className="flex-1 bg-white border border-slate-200 p-2 rounded text-xs font-bold text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 pl-1">Tel Secundário</label>
                    <div className="flex gap-1">
                      <input 
                        type="tel" 
                        placeholder="DDD" 
                        maxLength={2}
                        value={customerPhone2DDD}
                        onChange={(e) => setCustomerPhone2DDD(e.target.value.replace(/\D/g, ''))}
                        className="w-12 bg-white border border-slate-200 p-2 rounded text-xs font-bold text-slate-900 text-center"
                      />
                       <input 
                        type="tel" 
                        placeholder="Segunda via de contato" 
                        value={customerPhone2}
                        onChange={(e) => setCustomerPhone2(e.target.value.replace(/\D/g, ''))}
                        className="flex-1 bg-white border border-slate-200 p-2 rounded text-xs font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Summary */}
              <div className="max-h-32 overflow-y-auto mb-4 space-y-1">
                <span className="text-[8px] font-black text-slate-300 uppercase block mb-1">Itens Adicionados</span>
                {cartDetails.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between border-b border-slate-50 pb-1 text-slate-600 font-bold uppercase text-[9px]">
                    <span className="truncate pr-4">{item.product.name} ({item.cable.replace('c1','1m')})</span>
                    <span>{item.qty}x R$ {(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 mb-4 px-2 border-t pt-2">
                  <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase italic">
                    <span>FRETE PARA ENTREGA:</span>
                    {selectedState ? (
                      <span>R$ {freightValue.toFixed(2)}</span>
                    ) : (
                      <span className="text-red-500 animate-pulse">Preencha o seu CEP para cálculo do frete</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase">TOTAL ESTIMADO:</span>
                      <span className="text-blue-700 text-lg italic font-mono font-black">R$ {finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sticky bottom-0 bg-white pt-2">
                  <button 
                    onClick={handleInfinitePayCheckout}
                    disabled={isCheckoutLoading}
                    className={`bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg flex flex-col items-center justify-center gap-1 text-xs uppercase tracking-widest transition cursor-pointer border-b-4 border-blue-800 ${isCheckoutLoading ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      {isCheckoutLoading ? (
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      ) : (
                        <Smartphone className="w-4 h-4" />
                      )}
                      {isCheckoutLoading ? 'Processando...' : 'Pagar Agora (InfinitePay)'}
                    </div>
                    {!isCheckoutLoading && <span className="text-[10px] opacity-70">Cartão de Crédito ou PIX Parcelado</span>}
                  </button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => {
                        if (validateForm()) {
                          setShowPixModal(true);
                        }
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-black py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition cursor-pointer"
                    >
                      <Zap className="w-3 h-3 text-yellow-400" />
                      PIX Direto
                    </button>
                    <button 
                      onClick={() => handleProcessOrder()}
                      className="bg-green-600 hover:bg-green-700 text-white font-black py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition cursor-pointer"
                    >
                      <Share2 className="w-3 h-3" />
                      WhatsApp
                    </button>
                  </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PIX Modal */}
      <AnimatePresence>
        {showPixModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-slate-900/95 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border-4 border-blue-500"
            >
              <h2 className="font-black text-slate-900 uppercase text-lg mb-2 italic">Pagamento PIX</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-4 tracking-tighter">ELETRIZEI LTDA • 43.194.137/0001-37</p>
              
              <div className="bg-white p-4 rounded-2xl mb-4 flex justify-center border border-slate-100 shadow-inner">
                <QRCode value={pixPayload} size={200} />
              </div>

              <div className="bg-slate-100 p-3 rounded-xl mb-4 border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-black uppercase">Valor a Pagar:</p>
                  <p className="text-2xl font-black text-blue-700 italic">R$ {finalTotal.toFixed(2)}</p>
              </div>

              <button 
                onClick={handleCopyPix}
                className="w-full bg-slate-900 text-white font-black py-3 rounded-xl mb-3 text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'COPIADO!' : 'COPIAR CÓDIGO'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setShowPixModal(false)}
                  className="bg-slate-200 text-slate-600 font-black py-3 rounded-xl text-[10px] uppercase cursor-pointer"
                >
                  VOLTAR
                </button>
                <button 
                  onClick={() => { setShowPixModal(false); handleProcessOrder(true); }}
                  className="bg-green-600 text-white font-black py-3 rounded-xl text-[10px] uppercase cursor-pointer"
                >
                  PAGO / ENVIAR
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Cart Badge */}
      {!isCartOpen && totalItems > 0 && (
        <motion.button 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-blue-600 text-white p-4 rounded-full shadow-2xl flex items-center gap-3 border-2 border-blue-400 cursor-pointer hover:bg-blue-700 transition"
        >
          <span className="bg-red-600 text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
            {totalItems}
          </span>
          <span className="font-black text-xs uppercase hidden md:inline">Meu Pedido</span>
          <ShoppingCart className="w-5 h-5" />
        </motion.button>
      )}
    </div>
  );
}

// Sub-components for better organization
interface ProductCardProps {
  key?: any;
  product: Product;
  cart: Record<string, number>;
  updateQty: (id: number, cable: CableKey, delta: number) => void;
}

function ProductCard({ product, cart, updateQty }: ProductCardProps) {
  const isMetal = product.type === 'metal';
  return (
    <div className={`bg-white rounded-xl border p-4 border-l-4 ${isMetal ? 'border-l-orange-500' : 'border-l-slate-800'}`}>
        <div className="flex gap-4 items-center mb-4">
            <img 
              src={`https://via.placeholder.com/100?text=${encodeURIComponent(product.name)}`} 
              className="w-16 h-16 object-contain" 
            />
            <div>
              <span className="font-black uppercase text-xs text-slate-900 leading-tight block">{product.name}</span>
            </div>
        </div>
        <div className="space-y-4">
            {(['c1','c3','c5'] as CableKey[]).map(k => (
                <div key={k} className="flex justify-between items-center">
                    <span className="text-sm font-black text-slate-400 uppercase">Cabo {k.replace('c1','1m').replace('c3','3.0m').replace('c5','5.0m')}</span>
                    <div className="flex items-center gap-4">
                        <span className="font-black text-xl text-slate-900">R$ {product.unitPrices[k].toFixed(2)}</span>
                        <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-2">
                            <button onClick={() => updateQty(product.id, k, -1)} className="w-10 h-10 text-slate-400 text-2xl flex items-center justify-center">-</button>
                            <span className="w-10 text-center bg-transparent font-black text-lg">{cart[`${product.id}-${k}`] || 0}</span>
                            <button onClick={() => updateQty(product.id, k, 1)} className="w-10 h-10 text-blue-600 text-2xl flex items-center justify-center">+</button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}

function ProductDesktopCard({ product, cart, updateQty }: ProductCardProps) {
  const isMetal = product.type === 'metal';
  const accentColor = isMetal ? 'text-orange-700' : 'text-slate-900';
  
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex items-stretch h-full">
        <div className="w-40 bg-slate-100 flex items-center justify-center p-4 border-r">
            <img src={`https://via.placeholder.com/200?text=${encodeURIComponent(product.name)}`} className="max-h-full object-contain" />
        </div>
        <div className="flex-grow p-6 flex flex-col justify-between">
            <div>
              <h3 className={`font-black text-lg uppercase ${accentColor} leading-tight mb-4`}>{product.name}</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {(['c1','c3','c5'] as CableKey[]).map(k => (
                    <div key={k} className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase">{k.replace('c1','1m').replace('c3','3m').replace('c5','5m')}</span>
                        <span className="text-lg font-black text-slate-900 text-center">R$ {product.unitPrices[k].toFixed(2)}</span>
                        <div className="flex items-center mt-2 bg-slate-50 rounded-xl w-fit border border-slate-100 shadow-sm">
                            <button onClick={() => updateQty(product.id, k, -1)} className="px-3 py-1.5 text-slate-400 hover:text-red-500 transition text-xl font-bold">-</button>
                            <span className="w-10 text-center text-base font-black border-x border-slate-100">{cart[`${product.id}-${k}`] || 0}</span>
                            <button onClick={() => updateQty(product.id, k, 1)} className="px-3 py-1.5 text-blue-600 hover:text-blue-800 transition text-xl font-bold">+</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}
