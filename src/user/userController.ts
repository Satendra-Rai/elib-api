import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import userModel from "./userModel";
import bcrypt from "bcrypt";
import { sign } from "jsonwebtoken";
import { config } from "../config/config";
import { User } from "./userTypes";

const createUser = async(
    req: Request,
    res: Response, 
    next: NextFunction
) => {

    // Validation

    const {name, email, password} = req.body;

    if(!name || !email || !password) {
        const error = createHttpError(400, "All fields are required");
        return next(error);
    }

    //Database call
    
    try {

        const user = await userModel.findOne({ email });

        if(user) {
            const error = createHttpError(400, "User already exists with this email");
            return next(error);
        }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {

        return next(createHttpError(500, "Error while getting user"));

    }
    

    //Password hash

    let newUser: User;
    
    try {

        const hashedPassword = await bcrypt.hash(password, 10);

        newUser = await userModel.create({
            name,
            email,
            password: hashedPassword,
        });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {

        return next(createHttpError(500, "Error while creating user"));

    }

    // Token generation 

    try {

        const token = sign({sub: newUser._id}, config.jwtSecret as string, {
            expiresIn: '7d',
            algorithm: "HS256",
        });
    
        // Response
    
        res.json({ accessToken: token });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {

        return next(createHttpError(500, "Error while signing the jwt token"));
        
    }

    const token = sign({sub: newUser._id}, config.jwtSecret as string, {
        expiresIn: '7d',
        algorithm: "HS256",
    });

    // Response

    res.json({ accessToken: token });
};


export {createUser};