import express from 'express';
import createHttpError from 'http-errors';
import globalErrorHandler from './middlewares/globalErrorHandler';
import userRouter from './user/userRouter';

const app = express();

app.use(express.json());

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.get('/', (req, res, next) => {

    const error = createHttpError(400, "Something went wrong");
    throw error;
    
    res.json({message: "Welcome yo elib apis"});
});

app.use('/api/users', userRouter);

// Global error handler
app.use(globalErrorHandler);

export default app;