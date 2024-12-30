import { User } from "../user/userTypes";

export interface Book {
    _id: string;
    title: string;
    description: string;
    author: User;
    genre: string;
    coverImage: string;
    file: string;
    createAt: Date;
    updateAt: Date; 
}