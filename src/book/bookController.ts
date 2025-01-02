import path from "node:path";
import fs from "node:fs";
import { Request, Response, NextFunction } from "express";
import cloudinary from "../config/cloudinary";
import createHttpError from "http-errors";
import bookModel from "./bookModel";
import { AuthRequest } from "../middlewares/authenticate";

const createBook = async(
    req: Request,
    res: Response, 
    next: NextFunction
) => {

    const { title, genre, description} = req.body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    // 'application/pdf'
    const coverImageMimeType = files.coverImage[0].mimetype.split('/').at(-1);
    const fileName = files.coverImage[0].filename;
    const filePath = path.resolve(
        __dirname,
        "../../public/data/uploads",
        fileName
    );

    const bookFileName = files.file[0].filename;
    const bookFilePath = path.resolve(
        __dirname,
        "../../public/data/uploads",
        bookFileName
    );
    
    try {
        const uploadResult = await cloudinary.uploader.upload(filePath, {
            filename_override: fileName,
            folder: "book-covers",
            format: coverImageMimeType,
        });

        const bookFileUploadResult = await cloudinary.uploader.upload(
            bookFilePath,
            {
                resource_type: "raw",
                filename_override: bookFileName,
                folder: "book-pdfs",
                format: "pdf",
            }
        );
        const _req = req as AuthRequest;

        const newBook = await bookModel.create({
            title,
            description,
            genre,
            author: _req.userId,
            coverImage: uploadResult.secure_url,
            file: bookFileUploadResult.secure_url,
        });

        // Delete temp.files
        
        try {
            await fs.promises.unlink(filePath);
            await fs.promises.unlink(bookFilePath);
    
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
            return next(createHttpError(500, "Error while unlink file path in bookCreation"));
        }

        res.status(201).json({ id: newBook._id });
    } catch (err) {
        console.log(err);
        return next(createHttpError(500, "Error while uploading the files."));
    }
};

const updateBook = async (req: Request, res: Response, next: NextFunction) => {
    const { title, description, genre } = req.body;
    const bookId = req.params.bookId;

    let book;
    try {
        book = await bookModel.findOne({ _id: bookId });
    } catch (err) {
        console.error("Error finding the book:", err);
        return next(createHttpError(500, "Error finding the book."));
    }

    if (!book) {
        return next(createHttpError(404, "Book not found"));
    }

    // Check access
    const _req = req as AuthRequest;
    if (book.author.toString() !== _req.userId) {
        return next(createHttpError(403, "You cannot update others' books."));
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let completeCoverImage = "";
    let completeFileName = "";

    // Handle cover image upload
    if (files.coverImage) {
        const filename = files.coverImage[0].filename;
        const coverMimeType = files.coverImage[0].mimetype.split("/").at(-1);
        const filePath = path.resolve(
            __dirname,
            "../../public/data/uploads/" + filename
        );

        try {
            // Upload new cover image
            const uploadResult = await cloudinary.uploader.upload(filePath, {
                filename_override: filename,
                folder: "book-covers",
                format: coverMimeType,
            });

            completeCoverImage = uploadResult.secure_url;

            // Delete the old cover image from Cloudinary
            if (book.coverImage) {
                const publicId = book.coverImage.split("/").pop()?.split(".")[0];
                if (publicId) {
                    try {
                        await cloudinary.uploader.destroy(`book-covers/${publicId}`);
                    } catch (err) {
                        console.error("Error deleting old cover image from Cloudinary:", err);
                    }
                }
            }

            // Delete local file
            await fs.promises.unlink(filePath);
        } catch (err) {
            console.error("Error uploading cover image:", err);
            return next(createHttpError(500, "Error uploading cover image."));
        }
    }

    // Handle book file upload
    if (files.file) {
        const bookFilePath = path.resolve(
            __dirname,
            "../../public/data/uploads/" + files.file[0].filename
        );

        try {
            // Upload new book file
            const uploadResultPdf = await cloudinary.uploader.upload(bookFilePath, {
                resource_type: "raw",
                filename_override: files.file[0].filename,
                folder: "book-pdfs",
                format: "pdf",
            });

            completeFileName = uploadResultPdf.secure_url;

            // Delete the old book file from Cloudinary
            if (book.file) {
                const publicId = book.file.split("/").slice(-2).join("/");
                console.log(publicId);
                try {
                    await cloudinary.uploader.destroy(publicId, {
                        resource_type: "raw",
                    });
                } catch (err) {
                    console.error("Error deleting old book file from Cloudinary:", err);
                }
            }

            // Delete local file
            await fs.promises.unlink(bookFilePath);
        } catch (err) {
            console.error("Error uploading book file:", err);
            return next(createHttpError(500, "Error uploading book file."));
        }
    }

    // Update the book in the database
    let updatedBook;
    try {
        updatedBook = await bookModel.findOneAndUpdate(
            { _id: bookId },
            {
                title: title,
                description: description,
                genre: genre,
                coverImage: completeCoverImage || book.coverImage,
                file: completeFileName || book.file,
            },
            { new: true }
        );
    } catch (err) {
        console.error("Error updating the book:", err);
        return next(createHttpError(500, "Error updating the book."));
    }

    res.json(updatedBook);
};


const listBooks = async (req: Request, res: Response, next: NextFunction) => {
    
    try {
        const book = await bookModel.find().populate("author", "name");
        res.json(book);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
        return next(createHttpError(500, "Error while getting a book"));
    }
};

const getSingleBook = async (req: Request, res: Response, next: NextFunction) => {

    const bookId = req.params.bookId;

    try {
        const book = await bookModel.findOne({ _id: bookId }).populate("author", "name");
        if (!book) {
            return next(createHttpError(404, "Book not found."));
        }

        res.json(book);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
        return next(createHttpError(500, "Error while getting a book"));
    }
};

const deleteBook = async(req: Request, res: Response, next: NextFunction) => {

    const bookId = req.params.bookId;

    const book = await bookModel.findOne({ _id: bookId });
    if (!book) {
        return next(createHttpError(404, "Book not found"));
    }

    // Check Access
    const _req = req as AuthRequest;
    console.log(_req.userId);
    console.log(book.author.toString());
    if (book.author.toString() !== _req.userId) {
        return next(createHttpError(403, "You can not update others book."));
    }
    // book-covers/dkzujeho0txi0yrfqjsm
    // https://res.cloudinary.com/degzfrkse/image/upload/v1712590372/book-covers/u4bt9x7sv0r0cg5cuynm.png

    const coverFileSplits = book.coverImage.split("/");
    const coverImagePublicId = coverFileSplits.at(-2) + "/" + coverFileSplits.at(-1)?.split(".").at(-2);

    const bookFileSplits = book.file.split("/");
    const bookFilePublicId = bookFileSplits.at(-2) + "/" + bookFileSplits.at(-1);
    console.log("bookFilePublicId", bookFilePublicId);
    
    try {
        await cloudinary.uploader.destroy(coverImagePublicId);
        await cloudinary.uploader.destroy(bookFilePublicId, {
            resource_type: "raw",
        });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
        next(createHttpError(500, "Error while deleting data"));
    }

    await bookModel.deleteOne({ _id: bookId });

    res.sendStatus(204);
};

export { createBook, updateBook, listBooks, getSingleBook, deleteBook };