export type CardVariant={id:string;label:string;special:boolean};
export type TcgCard={id:string;number:string;name:string;image:string|null;dexIds:number[];setId:string;category:string;rarity:string;variants:CardVariant[]};
export type TcgSet={id:string;name:string;logo:string|null;releaseDate:string|null;series:string;official:number;total:number;variantCount:number;standardCount:number};
export type TcgCollection={owned:Record<string,string>;sets:Record<string,"standard"|"all">;progress:Record<string,{owned:number;total:number}>};
export type TcgCatalog={sets:TcgSet[];cards:TcgCard[];updatedAt:string};
export const cardKey=(cardId:string,variantId:string)=>`${cardId}:${variantId}`;
