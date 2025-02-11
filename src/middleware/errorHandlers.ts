/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';

class Middlewares {
    static notFound(req: Request, res: Response): Response {
        return res.status(404).json({
            status: 'error',
            error: true,
            message: 'Route does not Exist',
        });
    }
}

export default Middlewares;
