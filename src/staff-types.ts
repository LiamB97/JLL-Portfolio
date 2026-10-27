export interface StaffUser {id:string;name:string;email:string;role:'admin'|'broker_admin'|'broker';active:boolean}
export interface StaffCollection {id:string;slug:string;title:string;ownerId:string;developmentIds:string[];createdAt:string;updatedAt:string}
export type StaffRequest=(route:string,body?:unknown,method?:string)=>Promise<any>;
