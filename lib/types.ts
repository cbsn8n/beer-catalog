export interface Beer {
  id: number;
  name: string;
  image: string | null;
  type: string | null;
  sort: string | null;
  filtration: string | null;
  country: string | null;
  price: number | null;
  traits: {
    socks: boolean;
    bitter: boolean;
    sour: boolean;
    fruity: boolean;
    smoked: boolean;
    watery: boolean;
    spirity: boolean;
  };
  rating: number | null;
  comment: string | null;
}
