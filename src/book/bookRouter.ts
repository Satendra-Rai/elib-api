import express from "express";
import { createBook, updateBook } from "./bookController";
import multer from "multer";
import path from 'node:path';
import authenticate from "../middlewares/authenticate";

const bookRouter = express.Router();

// file store local -> upload cloudinary

const upLoad = multer({
    dest: path.resolve(__dirname, '../../public/data/uploads'),
    limits: {fileSize: 3e7} //30mb
});

// routes

bookRouter.post('/', authenticate, upLoad.fields([
    {name: "coverImage", maxCount: 1},
    {name: "file", maxCount: 1},
]), createBook);

bookRouter.post("/:bookId", authenticate, upLoad.fields([
    {name: "coverImage", maxCount: 1},
    {name: "file", maxCount: 1},
]), updateBook);

export default bookRouter;