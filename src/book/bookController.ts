import { NextFunction, Request, Response } from "express";

const createBook = async(
    req: Request,
    res: Response, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
) => {

    const {} = req.body;

    res.json({});

}

export { createBook };