
export type UserMode = 'consumidor' | 'revendedor' | null;

export interface Product {
  id: number;
  name: string;
  type: 'abs' | 'metal';
  img: string;
  master: number;
  masterPrices: {
    c1: number;
    c3: number;
    c5: number;
  };
  unitPrices: {
    c1: number;
    c3: number;
    c5: number;
  };
}

export type CableKey = 'c1' | 'c3' | 'c5';

export interface CartItem {
  productId: number;
  cable: CableKey;
  quantity: number;
}
