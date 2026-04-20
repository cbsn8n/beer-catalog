export interface BeerImage {
  local: string | null;
  remote: string | null;
  version?: number | null;
}

export interface Beer {
  id: number;
  name: string;
  image: string | null;
  imageVersion?: number | null;
  imageRemote?: string | null;
  images?: BeerImage[];
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
  visibility?: "public" | "user-only";
  ownerUserId?: number | null;
  createdByUserId?: number | null;
  userRating?: number | null;
  userComment?: string | null;
  userImages?: BeerImage[];
  userUpdatedAt?: string | null;
  userAddedByUser?: boolean;
}
